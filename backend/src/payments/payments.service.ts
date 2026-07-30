import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { CartService, CART_TTL_MS } from '../cart/cart.service';
import type { CartResponse } from '../cart/dto/cart-response';
import { SeatsService } from '../seats/seats.service';
import { SnacksService } from '../snacks/snacks.service';
import {
  OrderView,
  PaymentListResponse,
  PaymentResponse,
  WebhookResult,
} from './dto/payment-response';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';
import { OrderSnackItem } from './entities/order-snack-item.entity';
import { OrderTicketItem } from './entities/order-ticket-item.entity';
import { Order } from './entities/order.entity';
import { PaymentAudit } from './entities/payment-audit.entity';
import { Payment } from './entities/payment.entity';
import {
  OrderStatus,
  PaymentAuditEvent,
  PaymentMethod,
  PaymentStatus,
} from './enums/payment.enums';
import { PaymentGatewayService } from './payment-gateway.service';

/**
 * Proceso de pago seguro (HU-013).
 *
 * Flujo: validar carrito/sillas → orden → cobro cifrado → webhook →
 * sillas SOLD + stock − (tickets/factura = HU-014).
 *
 * RN-053 no confirmar sin pasarela · RN-054 liberar si falla ·
 * RN-055 auditoría · RN-056 idempotencia / no duplicar reserva.
 *
 * Separado de `CartService` (totales) y del gateway (Adapter) por SRP.
 */
@Injectable()
export class PaymentsService {
  /**
   * @param orderRepo - Órdenes de venta.
   * @param paymentRepo - Intentos de cobro.
   * @param auditRepo - Auditoría RN-055.
   * @param ticketItemRepo - Snapshot entradas.
   * @param snackItemRepo - Snapshot snacks.
   * @param cartService - Carrito ACTIVE → CHECKOUT → COMPLETED.
   * @param seatsService - Revalidación y venta de sillas.
   * @param snacksService - Descuento de inventario (RN-052).
   * @param gateway - Adapter AES + firma webhook.
   */
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentAudit)
    private readonly auditRepo: Repository<PaymentAudit>,
    @InjectRepository(OrderTicketItem)
    private readonly ticketItemRepo: Repository<OrderTicketItem>,
    @InjectRepository(OrderSnackItem)
    private readonly snackItemRepo: Repository<OrderSnackItem>,
    private readonly cartService: CartService,
    private readonly seatsService: SeatsService,
    private readonly snacksService: SnacksService,
    private readonly gateway: PaymentGatewayService,
  ) {}

  /**
   * `POST /payments`: inicia cobro sobre el carrito ACTIVE.
   *
   * @param userId - Usuario JWT.
   * @param dto - Medio, token, idempotencyKey.
   * @returns Pago PENDING + checkoutUrl (confirmación = webhook).
   */
  async create(userId: string, dto: CreatePaymentDto): Promise<PaymentResponse> {
    this.assertMethodRequirements(dto);

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `auto_${randomBytes(12).toString('hex')}`;

    const existingByKey = await this.paymentRepo.findOne({
      where: { idempotencyKey },
      relations: { order: true },
    });
    if (existingByKey) {
      if (existingByKey.userId !== userId) {
        throw new ConflictException(
          'idempotencyKey ya usado por otra cuenta (RN-056)',
        );
      }
      await this.audit(
        existingByKey.id,
        existingByKey.orderId,
        PaymentAuditEvent.IDEMPOTENT_REPLAY,
        { idempotencyKey },
      );
      return this.toResponse(existingByKey, existingByKey.order);
    }

    const { cart, view } = await this.cartService.prepareForPayment(userId);

    await this.seatsService.assertReservationHeld(
      userId,
      cart.reservationId,
      view.tickets.map((t) => t.seatId),
    );

    /** RN-056: no otro PENDING/APPROVED sobre la misma reserva. */
    const duplicate = await this.paymentRepo.findOne({
      where: {
        reservationId: cart.reservationId,
        status: In([PaymentStatus.PENDING, PaymentStatus.APPROVED]),
      },
    });
    if (duplicate) {
      throw new ConflictException(
        'Ya existe un pago pendiente o aprobado para esta reserva (RN-056)',
      );
    }

    if (view.summary.total <= 0) {
      throw new BadRequestException(
        'El total a pagar debe ser mayor que cero',
      );
    }

    const order = await this.buildOrder(userId, cart.id, view);
    const savedOrder = await this.orderRepo.save(order);

    const payment = this.paymentRepo.create({
      orderId: savedOrder.id,
      userId,
      cartId: cart.id,
      reservationId: cart.reservationId,
      method: dto.method,
      status: PaymentStatus.PENDING,
      amount: view.summary.total,
      currency: view.summary.currency,
      idempotencyKey,
      gatewayReference: 'pending',
      paymentMethodToken: dto.paymentMethodToken?.trim() ?? null,
      encryptedPayload: '',
      confirmedAt: null,
    });
    const savedPayment = await this.paymentRepo.save(payment);

    const charge = this.gateway.createCharge({
      orderId: savedOrder.id,
      paymentId: savedPayment.id,
      amount: Number(savedPayment.amount),
      currency: savedPayment.currency,
      method: savedPayment.method,
      paymentMethodToken: savedPayment.paymentMethodToken,
      bankCode: dto.bankCode?.trim() ?? null,
      reservationId: cart.reservationId,
      customerUserId: userId,
    });

    savedPayment.gatewayReference = charge.gatewayReference;
    savedPayment.encryptedPayload = charge.encryptedPayload;
    await this.paymentRepo.save(savedPayment);

    const expiresAt = new Date(Date.now() + CART_TTL_MS);
    await this.cartService.markCheckout(cart.id, userId, expiresAt);

    await this.audit(
      savedPayment.id,
      savedOrder.id,
      PaymentAuditEvent.CREATED,
      { method: dto.method, amount: savedPayment.amount },
    );
    await this.audit(
      savedPayment.id,
      savedOrder.id,
      PaymentAuditEvent.GATEWAY_SENT,
      { gatewayReference: charge.gatewayReference },
    );

    savedPayment.order = savedOrder;
    const response = this.toResponse(savedPayment, savedOrder);
    return { ...response, checkoutUrl: charge.checkoutUrl };
  }

  /**
   * `GET /payments`: pagos del usuario (más recientes primero).
   *
   * @param userId - JWT.
   * @returns Lista.
   */
  async listMine(userId: string): Promise<PaymentListResponse> {
    const items = await this.paymentRepo.find({
      where: { userId },
      relations: { order: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      items: items.map((p) => this.toResponse(p, p.order)),
      total: items.length,
    };
  }

  /**
   * `GET /payments/:id`: detalle de un pago propio.
   *
   * @param userId - JWT.
   * @param paymentId - UUID.
   * @returns Pago + orden.
   */
  async getMine(userId: string, paymentId: string): Promise<PaymentResponse> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: { order: true },
    });
    if (!payment) {
      throw new NotFoundException(`Pago no encontrado: ${paymentId}`);
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException('No puedes consultar este pago');
    }
    return this.toResponse(payment, payment.order);
  }

  /**
   * `POST /payments/webhook`: confirmación de la pasarela (RN-053).
   *
   * Sin JWT: autenticación por firma HMAC `x-payment-signature`.
   *
   * @param dto - Referencia + estado.
   * @param signatureHeader - Header de firma.
   * @returns Resultado idempotente si ya estaba resuelto.
   */
  async handleWebhook(
    dto: PaymentWebhookDto,
    signatureHeader: string | undefined,
  ): Promise<WebhookResult> {
    if (
      dto.status !== PaymentStatus.APPROVED &&
      dto.status !== PaymentStatus.REJECTED
    ) {
      throw new BadRequestException(
        'El webhook solo acepta APPROVED o REJECTED',
      );
    }

    const payment = await this.paymentRepo.findOne({
      where: dto.paymentId
        ? { id: dto.paymentId }
        : { gatewayReference: dto.gatewayReference },
      relations: { order: true },
    });
    if (!payment) {
      throw new NotFoundException(
        `Pago no encontrado para ref ${dto.gatewayReference}`,
      );
    }

    if (payment.gatewayReference !== dto.gatewayReference) {
      throw new BadRequestException('gatewayReference no coincide con el pago');
    }

    const amount = Number(payment.amount);
    const valid = this.gateway.verifyWebhookSignature(
      dto.gatewayReference,
      dto.status,
      amount,
      signatureHeader,
    );
    if (!valid) {
      throw new UnauthorizedException(
        'Firma de pasarela inválida (RN-053)',
      );
    }

    if (dto.amount !== undefined && Number(dto.amount) !== amount) {
      throw new BadRequestException(
        'El monto del webhook no coincide con el pago',
      );
    }

    await this.audit(
      payment.id,
      payment.orderId,
      PaymentAuditEvent.WEBHOOK_RECEIVED,
      { status: dto.status },
    );

    if (payment.status !== PaymentStatus.PENDING) {
      await this.audit(
        payment.id,
        payment.orderId,
        PaymentAuditEvent.IDEMPOTENT_REPLAY,
        { previousStatus: payment.status },
      );
      return {
        accepted: true,
        payment: this.toResponse(payment, payment.order),
        message: `Pago ya estaba en estado ${payment.status}`,
      };
    }

    if (dto.status === PaymentStatus.APPROVED) {
      await this.approvePayment(payment);
      const refreshed = await this.paymentRepo.findOneOrFail({
        where: { id: payment.id },
        relations: { order: true },
      });
      return {
        accepted: true,
        payment: this.toResponse(refreshed, refreshed.order),
        message: 'Pago aprobado; venta confirmada (RN-053)',
      };
    }

    await this.rejectPayment(payment);
    const refreshed = await this.paymentRepo.findOneOrFail({
      where: { id: payment.id },
      relations: { order: true },
    });
    return {
      accepted: true,
      payment: this.toResponse(refreshed, refreshed.order),
      message: 'Pago rechazado; sillas liberadas (RN-054)',
    };
  }

  /**
   * Confirma venta: sillas SOLD, stock −, orden PAID, carrito COMPLETED.
   */
  private async approvePayment(payment: Payment): Promise<void> {
    const order = payment.order;
    const seatIds = (order.tickets ?? []).map((t) => t.seatId);

    await this.seatsService.confirmReservationSold(
      payment.userId,
      payment.reservationId,
      seatIds,
    );
    await this.audit(
      payment.id,
      order.id,
      PaymentAuditEvent.SEATS_SOLD,
      { seatCount: seatIds.length },
    );

    const snackLines = (order.snacks ?? []).map((s) => ({
      snackId: s.snackId,
      quantity: s.quantity,
    }));
    if (snackLines.length > 0) {
      await this.snacksService.decrementStock(snackLines);
      await this.audit(
        payment.id,
        order.id,
        PaymentAuditEvent.STOCK_DECREMENTED,
        { lines: snackLines.length },
      );
    }

    payment.status = PaymentStatus.APPROVED;
    payment.confirmedAt = new Date();
    await this.paymentRepo.save(payment);

    order.status = OrderStatus.PAID;
    /** Flags para HU-014 (entradas/factura aún no generadas). */
    order.ticketsGenerated = false;
    order.invoiceGenerated = false;
    await this.orderRepo.save(order);

    await this.cartService.markCompleted(payment.cartId, payment.userId);

    await this.audit(payment.id, order.id, PaymentAuditEvent.APPROVED, {
      amount: payment.amount,
    });
  }

  /**
   * Rechazo: libera sillas y cancela orden/carrito (RN-054).
   */
  private async rejectPayment(payment: Payment): Promise<void> {
    const released = await this.cartService.failCheckout(
      payment.cartId,
      payment.userId,
    );
    await this.audit(
      payment.id,
      payment.orderId,
      PaymentAuditEvent.SEATS_RELEASED,
      { released },
    );

    payment.status = PaymentStatus.REJECTED;
    payment.confirmedAt = new Date();
    await this.paymentRepo.save(payment);

    await this.orderRepo.update(payment.orderId, {
      status: OrderStatus.FAILED,
    });

    await this.audit(payment.id, payment.orderId, PaymentAuditEvent.REJECTED, {
      amount: payment.amount,
    });
  }

  /**
   * Arma la orden + líneas desde la vista del carrito.
   */
  private async buildOrder(
    userId: string,
    cartId: string,
    view: CartResponse,
  ): Promise<Order> {
    const order = this.orderRepo.create({
      userId,
      cartId,
      reservationId: view.reservationId,
      showtimeId: view.showtimeId,
      status: OrderStatus.PENDING,
      currency: view.summary.currency,
      ticketsSubtotal: view.summary.ticketsSubtotal,
      snacksSubtotal: view.summary.snacksSubtotal,
      subtotal: view.summary.subtotal,
      membershipDiscount: view.summary.membershipDiscount,
      promoDiscount: view.summary.promoDiscount,
      giftcardAmount: view.summary.giftcardAmount,
      tax: view.summary.tax,
      total: view.summary.total,
      promoCode: view.promo.code,
      cinemaId: view.pickup.cinemaId,
      cinemaName: view.pickup.cinemaName,
      ticketsGenerated: false,
      invoiceGenerated: false,
      tickets: view.tickets.map((t) =>
        this.ticketItemRepo.create({
          seatId: t.seatId,
          seatLabel: t.seatLabel,
          movieId: t.movieId,
          movieTitle: t.movieTitle,
          startsAt: new Date(t.startsAt),
          roomName: t.roomName,
          cinemaName: t.cinemaName,
          format: t.format,
          language: t.language,
          unitPrice: t.unitPrice,
          membershipDiscount: t.membershipDiscount,
          lineTotal: t.lineTotal,
        }),
      ),
      snacks: view.snacks.map((s) =>
        this.snackItemRepo.create({
          snackId: s.snackId,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          membershipDiscount: s.membershipDiscount,
          lineTotal: s.lineTotal,
        }),
      ),
    });
    return order;
  }

  private assertMethodRequirements(dto: CreatePaymentDto): void {
    const cardMethods = [
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
    ];
    if (cardMethods.includes(dto.method) && !dto.paymentMethodToken?.trim()) {
      throw new BadRequestException(
        'paymentMethodToken es obligatorio para tarjeta (tokenización; nunca envíes el PAN)',
      );
    }
  }

  private async audit(
    paymentId: string,
    orderId: string,
    event: PaymentAuditEvent,
    detail?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditRepo.save(
      this.auditRepo.create({
        paymentId,
        orderId,
        event,
        detail: detail ? JSON.stringify(detail) : null,
      }),
    );
  }

  private toResponse(payment: Payment, order: Order): PaymentResponse {
    const publicUrl = process.env.APP_PUBLIC_URL ?? 'http://localhost:3000';
    const checkoutUrl = `${publicUrl.replace(/\/$/, '')}/payments/checkout-demo?ref=${payment.gatewayReference}`;

    let seats: PaymentResponse['fulfillment']['seats'] = 'LOCKED';
    let snacksStock: PaymentResponse['fulfillment']['snacksStock'] =
      'RESERVED';
    if (payment.status === PaymentStatus.APPROVED) {
      seats = 'SOLD';
      snacksStock =
        (order.snacks ?? []).length > 0 ? 'DECREMENTED' : 'UNCHANGED';
    } else if (payment.status === PaymentStatus.REJECTED) {
      seats = 'RELEASED';
      snacksStock = 'UNCHANGED';
    }

    return {
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: Number(payment.amount),
      currency: payment.currency,
      idempotencyKey: payment.idempotencyKey,
      gatewayReference: payment.gatewayReference,
      checkoutUrl,
      order: this.toOrderView(order),
      fulfillment: {
        seats,
        snacksStock,
        tickets:
          payment.status === PaymentStatus.APPROVED
            ? 'PENDING_HU_014'
            : 'SKIPPED',
        invoice:
          payment.status === PaymentStatus.APPROVED
            ? 'PENDING_HU_014'
            : 'SKIPPED',
      },
      confirmedAt: payment.confirmedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private toOrderView(order: Order): OrderView {
    return {
      id: order.id,
      status: order.status,
      currency: order.currency,
      ticketsSubtotal: Number(order.ticketsSubtotal),
      snacksSubtotal: Number(order.snacksSubtotal),
      subtotal: Number(order.subtotal),
      membershipDiscount: Number(order.membershipDiscount),
      promoDiscount: Number(order.promoDiscount),
      giftcardAmount: Number(order.giftcardAmount),
      tax: Number(order.tax),
      total: Number(order.total),
      promoCode: order.promoCode,
      cinemaId: order.cinemaId,
      cinemaName: order.cinemaName,
      ticketsGenerated: order.ticketsGenerated,
      invoiceGenerated: order.invoiceGenerated,
      tickets: (order.tickets ?? []).map((t) => ({
        seatId: t.seatId,
        seatLabel: t.seatLabel,
        movieTitle: t.movieTitle,
        startsAt: t.startsAt.toISOString(),
        roomName: t.roomName,
        cinemaName: t.cinemaName,
        format: t.format,
        unitPrice: Number(t.unitPrice),
        lineTotal: Number(t.lineTotal),
      })),
      snacks: (order.snacks ?? []).map((s) => ({
        snackId: s.snackId,
        name: s.name,
        quantity: s.quantity,
        unitPrice: Number(s.unitPrice),
        lineTotal: Number(s.lineTotal),
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }
}
