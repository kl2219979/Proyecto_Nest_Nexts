import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { MembershipService } from '../membership/membership.service';
import { EmailService } from '../notifications/email.service';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import {
  PaymentMethod,
  PaymentStatus,
} from '../payments/enums/payment.enums';
import {
  GiftcardListResponse,
  GiftcardPurchaseResponse,
  GiftcardRedeemResponse,
  GiftcardView,
  GiftcardWebhookResult,
} from './dto/giftcard-response';
import {
  GiftcardWebhookDto,
  PurchaseGiftcardDto,
  RedeemGiftcardDto,
} from './dto/giftcard.dto';
import { Giftcard } from './entities/giftcard.entity';
import {
  GiftcardStatus,
  GiftcardTheme,
} from './enums/giftcard.enums';

const DEFAULT_EXPIRY_DAYS = 365;
const MIN_CUSTOM_AMOUNT = 10_000;
const MAX_CUSTOM_AMOUNT = 1_000_000;

/**
 * Compra, entrega y redención de bonos digitales (HU-018).
 *
 * Responsabilidades (SRP):
 * - Venta + cobro stub (reusa `PaymentGatewayService`, Adapter HU-013).
 * - Código/QR únicos (RN-076), expiración (RN-078), uso parcial (RN-077).
 * - Correo inmediato o programado; crédito a billetera / consumo en carrito.
 *
 * Separado de `PaymentsService` (órdenes con sillas) para no acoplar
 * giftcards al carrito de entradas.
 */
@Injectable()
export class GiftcardsService {
  private readonly logger = new Logger(GiftcardsService.name);

  /**
   * @param giftcardRepo - Persistencia de bonos.
   * @param userRepo - Email del comprador / destinatario.
   * @param gateway - Cifrado + firma HMAC (Adapter).
   * @param emailService - Plantilla GIFTCARD (HU-015).
   * @param membershipService - Crédito a billetera al redimir.
   * @param config - Expiración / partial default / URL pública.
   */
  constructor(
    @InjectRepository(Giftcard)
    private readonly giftcardRepo: Repository<Giftcard>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gateway: PaymentGatewayService,
    private readonly emailService: EmailService,
    private readonly membershipService: MembershipService,
    private readonly config: ConfigService,
  ) {}

  /**
   * `POST /giftcards`: inicia compra (PENDING_PAYMENT + checkout).
   *
   * @param userId - Comprador JWT.
   * @param dto - Valor, destinatario, mensaje, pago.
   * @returns Bono + URL de checkout demo.
   */
  async purchase(
    userId: string,
    dto: PurchaseGiftcardDto,
  ): Promise<GiftcardPurchaseResponse> {
    this.assertMethodRequirements(dto);
    const amount = this.normalizeAmount(dto.amount);

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `gc_${randomBytes(12).toString('hex')}`;

    const existing = await this.giftcardRepo.findOne({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.purchaserUserId !== userId) {
        throw new ConflictException(
          'idempotencyKey ya usado por otra cuenta',
        );
      }
      return this.toPurchaseResponse(existing);
    }

    let scheduledSendAt: Date | null = null;
    if (dto.scheduledSendAt) {
      scheduledSendAt = new Date(dto.scheduledSendAt);
      if (Number.isNaN(scheduledSendAt.getTime())) {
        throw new BadRequestException('scheduledSendAt inválido');
      }
      if (scheduledSendAt.getTime() <= Date.now()) {
        throw new BadRequestException(
          'scheduledSendAt debe ser una fecha futura',
        );
      }
    }

    const expiryDays =
      dto.expiresInDays ??
      this.config.get<number>('GIFTCARD_EXPIRY_DAYS') ??
      DEFAULT_EXPIRY_DAYS;
    const allowPartial =
      dto.allowPartialUse ??
      this.config.get<string>('GIFTCARD_ALLOW_PARTIAL') !== 'false';

    const code = await this.generateUniqueCode();
    const qrPayload = `MCGCQR-${code}`;

    const draft = this.giftcardRepo.create({
      code,
      qrPayload,
      purchaserUserId: userId,
      recipientName: dto.recipientName.trim(),
      recipientEmail: dto.recipientEmail.trim().toLowerCase(),
      message: dto.message?.trim() || null,
      theme: dto.theme ?? GiftcardTheme.GENERIC,
      faceValue: amount,
      remainingBalance: amount,
      allowPartialUse: allowPartial,
      status: GiftcardStatus.PENDING_PAYMENT,
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      scheduledSendAt,
      sentAt: null,
      paymentMethod: dto.method,
      idempotencyKey,
      gatewayReference: 'pending',
      paymentMethodToken: dto.paymentMethodToken?.trim() ?? null,
      encryptedPayload: '',
      paidAt: null,
    });
    const saved = await this.giftcardRepo.save(draft);

    const charge = this.gateway.createCharge({
      orderId: saved.id,
      paymentId: saved.id,
      amount,
      currency: 'COP',
      method: dto.method,
      paymentMethodToken: saved.paymentMethodToken,
      bankCode: dto.bankCode?.trim() ?? null,
      reservationId: saved.id,
      customerUserId: userId,
    });

    saved.gatewayReference = charge.gatewayReference;
    saved.encryptedPayload = charge.encryptedPayload;
    await this.giftcardRepo.save(saved);

    return this.toPurchaseResponse(saved, charge.checkoutUrl);
  }

  /**
   * `GET /giftcards`: bonos comprados y recibidos (por email del JWT).
   *
   * @param userId - JWT.
   * @param email - Email del JWT (recibidos).
   */
  async listMine(userId: string, email: string): Promise<GiftcardListResponse> {
    const purchased = await this.giftcardRepo.find({
      where: { purchaserUserId: userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const receivedRaw = await this.giftcardRepo.find({
      where: {
        recipientEmail: email.trim().toLowerCase(),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const received = receivedRaw.filter(
      (g) =>
        g.status !== GiftcardStatus.PENDING_PAYMENT &&
        g.status !== GiftcardStatus.CANCELLED,
    );

    const purchasedViews: GiftcardView[] = [];
    for (const g of purchased) {
      purchasedViews.push(this.toView(await this.expireIfNeeded(g)));
    }
    const receivedViews: GiftcardView[] = [];
    for (const g of received) {
      receivedViews.push(this.toView(await this.expireIfNeeded(g)));
    }

    return {
      purchased: purchasedViews,
      received: receivedViews,
      total: purchasedViews.length + receivedViews.length,
    };
  }

  /**
   * `GET /giftcards/:code`: consulta por código (RN-076).
   *
   * @param code - Código del bono.
   */
  async getByCode(code: string): Promise<GiftcardView> {
    const giftcard = await this.requireByCode(code);
    return this.toView(await this.expireIfNeeded(giftcard));
  }

  /**
   * `POST /giftcards/redeem`: carga saldo a la billetera del JWT.
   *
   * @param userId - Quien redime.
   * @param dto - Código + monto opcional.
   */
  async redeemToWallet(
    userId: string,
    dto: RedeemGiftcardDto,
  ): Promise<GiftcardRedeemResponse> {
    const giftcard = await this.requireRedeemable(dto.code);
    const remaining = Number(giftcard.remainingBalance);
    let amount = dto.amount !== undefined ? Number(dto.amount) : remaining;

    if (amount <= 0) {
      throw new BadRequestException('El monto a redimir debe ser positivo');
    }
    if (amount > remaining) {
      throw new ConflictException({
        message: 'Monto mayor al saldo del bono',
        code: 'GIFTCARD_INSUFFICIENT',
        remainingBalance: remaining,
      });
    }
    if (!giftcard.allowPartialUse && amount < remaining) {
      throw new ConflictException({
        message: 'Este bono no admite uso parcial (RN-077); redime el total',
        code: 'GIFTCARD_NO_PARTIAL',
        remainingBalance: remaining,
      });
    }

    const walletBalance = await this.membershipService.creditWallet(
      userId,
      amount,
    );
    giftcard.remainingBalance = Number((remaining - amount).toFixed(2));
    if (Number(giftcard.remainingBalance) <= 0) {
      giftcard.remainingBalance = 0;
      giftcard.status = GiftcardStatus.REDEEMED;
    }
    await this.giftcardRepo.save(giftcard);

    return {
      giftcard: this.toView(giftcard),
      creditedAmount: amount,
      walletBalance,
    };
  }

  /**
   * `POST /giftcards/webhook`: confirma o rechaza el cobro (firma HMAC).
   *
   * @param dto - Ref + estado.
   * @param signatureHeader - `x-payment-signature`.
   */
  async handleWebhook(
    dto: GiftcardWebhookDto,
    signatureHeader: string | undefined,
  ): Promise<GiftcardWebhookResult> {
    if (
      dto.status !== PaymentStatus.APPROVED &&
      dto.status !== PaymentStatus.REJECTED
    ) {
      throw new BadRequestException(
        'El webhook solo acepta APPROVED o REJECTED',
      );
    }

    const giftcard = await this.giftcardRepo.findOne({
      where: { gatewayReference: dto.gatewayReference },
    });
    if (!giftcard) {
      throw new NotFoundException(
        `Giftcard no encontrada para ref ${dto.gatewayReference}`,
      );
    }

    const amount = Number(giftcard.faceValue);
    const valid = this.gateway.verifyWebhookSignature(
      dto.gatewayReference,
      dto.status,
      amount,
      signatureHeader,
    );
    if (!valid) {
      throw new UnauthorizedException('Firma de pasarela inválida');
    }

    if (dto.amount !== undefined && Number(dto.amount) !== amount) {
      throw new BadRequestException(
        'El monto del webhook no coincide con el bono',
      );
    }

    if (giftcard.status !== GiftcardStatus.PENDING_PAYMENT) {
      return {
        accepted: true,
        giftcard: this.toView(giftcard),
        message: `Bono ya estaba en estado ${giftcard.status}`,
      };
    }

    if (dto.status === PaymentStatus.REJECTED) {
      giftcard.status = GiftcardStatus.CANCELLED;
      await this.giftcardRepo.save(giftcard);
      return {
        accepted: true,
        giftcard: this.toView(giftcard),
        message: 'Pago rechazado; bono cancelado',
      };
    }

    giftcard.status = GiftcardStatus.ACTIVE;
    giftcard.paidAt = new Date();
    await this.giftcardRepo.save(giftcard);

    await this.tryDeliverEmail(giftcard);

    return {
      accepted: true,
      giftcard: this.toView(giftcard),
      message: 'Pago aprobado; bono activo (RN-076)',
    };
  }

  /**
   * Valida un código para aplicarlo al carrito (RN-077/079).
   * No debita: el consumo ocurre al confirmar el pago de la orden.
   *
   * @param code - Código del bono.
   * @param maxApplicable - Tope = total del carrito tras descuentos+IVA.
   * @returns Monto a aplicar y entidad.
   */
  async previewForCart(
    code: string,
    maxApplicable: number,
  ): Promise<{ giftcard: Giftcard; amount: number }> {
    const giftcard = await this.requireRedeemable(code);
    const remaining = Number(giftcard.remainingBalance);
    if (maxApplicable <= 0) {
      throw new BadRequestException(
        'El carrito no tiene total positivo para aplicar el bono',
      );
    }

    let amount = Math.min(remaining, maxApplicable);
    amount = Number(amount.toFixed(2));

    if (!giftcard.allowPartialUse && amount < remaining) {
      throw new ConflictException({
        message:
          'Este bono no admite uso parcial (RN-077); el total del carrito debe cubrir el saldo completo',
        code: 'GIFTCARD_NO_PARTIAL',
        remainingBalance: remaining,
        cartPayable: maxApplicable,
      });
    }

    return { giftcard, amount };
  }

  /**
   * Debita saldo tras orden PAID (llamado desde PaymentsService).
   *
   * @param code - Código aplicado en el carrito.
   * @param amount - Monto congelado en la orden (`giftcardAmount`).
   */
  async consumeForOrder(code: string, amount: number): Promise<void> {
    if (!code || amount <= 0) {
      return;
    }
    const giftcard = await this.giftcardRepo.findOne({
      where: { code: code.trim().toUpperCase() },
    });
    if (!giftcard) {
      this.logger.warn(`consumeForOrder: bono ${code} no encontrado`);
      return;
    }
    const remaining = Number(giftcard.remainingBalance);
    const debit = Math.min(remaining, Number(amount));
    giftcard.remainingBalance = Number((remaining - debit).toFixed(2));
    if (giftcard.remainingBalance <= 0) {
      giftcard.remainingBalance = 0;
      giftcard.status = GiftcardStatus.REDEEMED;
    }
    await this.giftcardRepo.save(giftcard);
  }

  /**
   * Cron: envía correos pendientes (inmediato fallido o programado vencido).
   *
   * @returns Cantidad enviada.
   */
  async deliverScheduledDue(): Promise<number> {
    const pending = await this.giftcardRepo
      .createQueryBuilder('g')
      .where('g.status = :status', { status: GiftcardStatus.ACTIVE })
      .andWhere('g.sentAt IS NULL')
      .andWhere(
        '(g.scheduledSendAt IS NULL OR g.scheduledSendAt <= :now)',
        { now: new Date() },
      )
      .take(50)
      .getMany();

    let sent = 0;
    for (const g of pending) {
      const ok = await this.tryDeliverEmail(g);
      if (ok) sent += 1;
    }
    return sent;
  }

  /**
   * Envía el correo si corresponde (inmediato o fecha vencida).
   *
   * @param giftcard - Bono ACTIVE.
   * @returns `true` si se encoló el correo.
   */
  async tryDeliverEmail(giftcard: Giftcard): Promise<boolean> {
    if (giftcard.status !== GiftcardStatus.ACTIVE || giftcard.sentAt) {
      return false;
    }
    if (
      giftcard.scheduledSendAt &&
      giftcard.scheduledSendAt.getTime() > Date.now()
    ) {
      return false;
    }

    try {
      const purchaser = await this.userRepo.findOne({
        where: { id: giftcard.purchaserUserId },
      });
      await this.emailService.sendGiftcard({
        toEmail: giftcard.recipientEmail,
        recipientName: giftcard.recipientName,
        purchaserEmail: purchaser?.email ?? 'un amigo',
        code: giftcard.code,
        qrPayload: giftcard.qrPayload,
        faceValue: Number(giftcard.faceValue).toFixed(2),
        remainingBalance: Number(giftcard.remainingBalance).toFixed(2),
        message: giftcard.message,
        theme: giftcard.theme,
        expiresAt: giftcard.expiresAt.toISOString(),
        giftcardId: giftcard.id,
      });
      giftcard.sentAt = new Date();
      await this.giftcardRepo.save(giftcard);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Fallo correo giftcard ${giftcard.id}: ${msg}`);
      return false;
    }
  }

  private async requireByCode(code: string): Promise<Giftcard> {
    const normalized = code.trim().toUpperCase();
    const giftcard = await this.giftcardRepo.findOne({
      where: { code: normalized },
    });
    if (!giftcard) {
      throw new NotFoundException(`Bono no encontrado: ${normalized}`);
    }
    return giftcard;
  }

  private async requireRedeemable(code: string): Promise<Giftcard> {
    let giftcard = await this.requireByCode(code);
    giftcard = await this.expireIfNeeded(giftcard);
    if (giftcard.status === GiftcardStatus.EXPIRED) {
      throw new ConflictException({
        message: 'El bono expiró (RN-078)',
        code: 'GIFTCARD_EXPIRED',
      });
    }
    if (giftcard.status === GiftcardStatus.PENDING_PAYMENT) {
      throw new ConflictException('El bono aún no está pagado');
    }
    if (giftcard.status === GiftcardStatus.CANCELLED) {
      throw new ConflictException('El bono fue cancelado');
    }
    if (
      giftcard.status === GiftcardStatus.REDEEMED ||
      Number(giftcard.remainingBalance) <= 0
    ) {
      throw new ConflictException({
        message: 'El bono ya fue redimido por completo',
        code: 'GIFTCARD_REDEEMED',
      });
    }
    if (giftcard.status !== GiftcardStatus.ACTIVE) {
      throw new ConflictException(`Estado no redimible: ${giftcard.status}`);
    }
    return giftcard;
  }

  private async expireIfNeeded(giftcard: Giftcard): Promise<Giftcard> {
    if (
      giftcard.status === GiftcardStatus.ACTIVE &&
      giftcard.expiresAt.getTime() <= Date.now()
    ) {
      giftcard.status = GiftcardStatus.EXPIRED;
      await this.giftcardRepo.save(giftcard);
    }
    return giftcard;
  }

  private normalizeAmount(amount: number): number {
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n < MIN_CUSTOM_AMOUNT || n > MAX_CUSTOM_AMOUNT) {
      throw new BadRequestException(
        `Monto fuera de rango (${MIN_CUSTOM_AMOUNT}–${MAX_CUSTOM_AMOUNT} COP)`,
      );
    }
    return n;
  }

  private assertMethodRequirements(dto: PurchaseGiftcardDto): void {
    const cardMethods = [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD];
    if (cardMethods.includes(dto.method) && !dto.paymentMethodToken?.trim()) {
      throw new BadRequestException(
        'paymentMethodToken es obligatorio para tarjeta (tokenización)',
      );
    }
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 12; i += 1) {
      const code = `MCGC-${randomBytes(4).toString('hex').toUpperCase()}`;
      const clash = await this.giftcardRepo.findOne({ where: { code } });
      if (!clash) return code;
    }
    throw new ConflictException('No se pudo generar código único (RN-076)');
  }

  private toView(g: Giftcard): GiftcardView {
    return {
      id: g.id,
      code: g.code,
      qrPayload: g.qrPayload,
      recipientName: g.recipientName,
      recipientEmail: g.recipientEmail,
      message: g.message,
      theme: g.theme,
      faceValue: Number(g.faceValue),
      remainingBalance: Number(g.remainingBalance),
      allowPartialUse: g.allowPartialUse,
      status: g.status,
      expiresAt: g.expiresAt.toISOString(),
      scheduledSendAt: g.scheduledSendAt
        ? g.scheduledSendAt.toISOString()
        : null,
      sentAt: g.sentAt ? g.sentAt.toISOString() : null,
      paidAt: g.paidAt ? g.paidAt.toISOString() : null,
      createdAt: g.createdAt.toISOString(),
    };
  }

  private toPurchaseResponse(
    g: Giftcard,
    checkoutUrl?: string,
  ): GiftcardPurchaseResponse {
    const publicUrl =
      this.config.get<string>('APP_PUBLIC_URL') ?? 'http://localhost:3000';
    const url =
      checkoutUrl ??
      (g.status === GiftcardStatus.PENDING_PAYMENT
        ? `${publicUrl.replace(/\/$/, '')}/payments/checkout-demo?ref=${g.gatewayReference}`
        : null);

    let paymentStatus: GiftcardPurchaseResponse['payment']['status'] =
      'PENDING';
    if (g.status === GiftcardStatus.CANCELLED) paymentStatus = 'REJECTED';
    else if (
      g.status === GiftcardStatus.ACTIVE ||
      g.status === GiftcardStatus.REDEEMED ||
      g.status === GiftcardStatus.EXPIRED
    ) {
      paymentStatus = 'APPROVED';
    }

    return {
      giftcard: this.toView(g),
      payment: {
        status: paymentStatus,
        gatewayReference: g.gatewayReference,
        checkoutUrl: url,
        amount: Number(g.faceValue),
        currency: 'COP',
      },
    };
  }
}
