import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { DocumentPdfService } from './document-pdf.service';
import {
  FulfillmentDocuments,
  InvoiceLineSnapshot,
  InvoiceView,
  TicketListResponse,
  TicketValidationResult,
  TicketView,
} from './dto/ticket-response';
import { Invoice } from './entities/invoice.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus, TicketType } from './enums/ticket.enums';

/**
 * Entradas digitales, factura y validación en puerta (HU-014 / HU-024).
 *
 * Generación tras webhook APPROVED; consulta/PDF (RN-057…060);
 * escaneo QR en puerta (RN-102…104).
 *
 * Separado de `PaymentsService` (SRP): cobro vs documentos de ingreso.
 */
@Injectable()
export class TicketsService {
  /**
   * @param ticketRepo - Entradas digitales.
   * @param invoiceRepo - Facturas / comprobantes.
   * @param orderRepo - Órdenes PAID a cumplir.
   * @param userRepo - Email del comprador.
   * @param profileRepo - Nombre del comprador.
   * @param pdfService - Generación PDFKit + QR.
   */
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    private readonly pdfService: DocumentPdfService,
  ) {}

  /**
   * Tras pago APPROVED: crea una entrada por silla + factura 1:1.
   *
   * Idempotente: si la orden ya tiene documentos, los reutiliza
   * (replay del webhook RN-056).
   *
   * @param orderId - UUID de la orden PAID.
   * @returns Entradas + factura generadas.
   */
  async fulfillPaidOrder(orderId: string): Promise<FulfillmentDocuments> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { tickets: true, snacks: true },
    });
    if (!order) {
      throw new NotFoundException(`Orden no encontrada: ${orderId}`);
    }
    if (order.status !== OrderStatus.PAID) {
      throw new ConflictException(
        'Solo se generan documentos para órdenes PAID',
      );
    }

    if (order.ticketsGenerated && order.invoiceGenerated) {
      return this.loadFulfillment(orderId, order.userId);
    }

    const existingInvoice = await this.invoiceRepo.findOne({
      where: { orderId },
    });
    if (existingInvoice) {
      order.ticketsGenerated = true;
      order.invoiceGenerated = true;
      await this.orderRepo.save(order);
      return this.loadFulfillment(orderId, order.userId);
    }

    const { buyerName, buyerEmail } = await this.resolveBuyer(order.userId);
    const ticketEntities: Ticket[] = [];

    for (const line of order.tickets ?? []) {
      const code = await this.generateUniqueTicketCode();
      const qrPayload = await this.generateUniqueQrPayload();
      ticketEntities.push(
        this.ticketRepo.create({
          orderId: order.id,
          orderTicketItemId: line.id,
          userId: order.userId,
          code,
          qrPayload,
          status: TicketStatus.VALID,
          ticketType: TicketType.STANDARD,
          movieTitle: line.movieTitle,
          startsAt: line.startsAt,
          cinemaName: line.cinemaName,
          roomName: line.roomName,
          seatLabel: line.seatLabel,
          format: line.format,
          language: line.language,
          buyerName,
          usedAt: null,
          validatedByUserId: null,
        }),
      );
    }

    const savedTickets = await this.ticketRepo.save(ticketEntities);

    const lines: InvoiceLineSnapshot[] = [
      ...(order.tickets ?? []).map((t) => ({
        kind: 'TICKET' as const,
        description: `${t.movieTitle} · ${t.format}`,
        quantity: 1,
        unitPrice: Number(t.unitPrice),
        lineTotal: Number(t.lineTotal),
        seatLabel: t.seatLabel,
        startsAt: t.startsAt.toISOString(),
      })),
      ...(order.snacks ?? []).map((s) => ({
        kind: 'SNACK' as const,
        description: s.name,
        quantity: s.quantity,
        unitPrice: Number(s.unitPrice),
        lineTotal: Number(s.lineTotal),
      })),
    ];

    const invoice = await this.invoiceRepo.save(
      this.invoiceRepo.create({
        orderId: order.id,
        userId: order.userId,
        number: await this.generateUniqueInvoiceNumber(),
        currency: order.currency,
        ticketsSubtotal: order.ticketsSubtotal,
        snacksSubtotal: order.snacksSubtotal,
        subtotal: order.subtotal,
        membershipDiscount: order.membershipDiscount,
        promoDiscount: order.promoDiscount,
        giftcardAmount: order.giftcardAmount,
        tax: order.tax,
        total: order.total,
        promoCode: order.promoCode,
        cinemaName: order.cinemaName,
        buyerName,
        buyerEmail,
        linesJson: JSON.stringify(lines),
        termsText: DocumentPdfService.DEFAULT_TERMS,
        issuedAt: new Date(),
      }),
    );

    order.ticketsGenerated = true;
    order.invoiceGenerated = true;
    await this.orderRepo.save(order);

    return {
      tickets: savedTickets.map((t) => this.toTicketView(t, invoice.id)),
      invoice: this.toInvoiceView(
        invoice,
        lines,
        savedTickets.map((t) => t.id),
      ),
    };
  }

  /**
   * `GET /tickets`: entradas del usuario (Mis compras).
   *
   * @param userId - JWT.
   * @returns Lista ordenada por fecha desc.
   */
  async listMine(userId: string): Promise<TicketListResponse> {
    const items = await this.ticketRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const invoiceByOrder = await this.mapInvoiceIdsByOrder(
      items.map((t) => t.orderId),
    );
    return {
      items: items.map((t) =>
        this.toTicketView(t, invoiceByOrder.get(t.orderId) ?? null),
      ),
      total: items.length,
    };
  }

  /**
   * Detalle de una entrada propia.
   *
   * @param userId - JWT.
   * @param ticketId - UUID.
   * @returns Vista de entrada.
   */
  async getMine(userId: string, ticketId: string): Promise<TicketView> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Entrada no encontrada: ${ticketId}`);
    }
    if (ticket.userId !== userId) {
      throw new ForbiddenException('No puedes consultar esta entrada');
    }
    const invoice = await this.invoiceRepo.findOne({
      where: { orderId: ticket.orderId },
    });
    return this.toTicketView(ticket, invoice?.id ?? null);
  }

  /**
   * `GET /invoice/:id`: factura propia.
   *
   * @param userId - JWT.
   * @param invoiceId - UUID.
   * @returns Vista de factura.
   */
  async getInvoiceMine(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceView> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura no encontrada: ${invoiceId}`);
    }
    if (invoice.userId !== userId) {
      throw new ForbiddenException('No puedes consultar esta factura');
    }
    const tickets = await this.ticketRepo.find({
      where: { orderId: invoice.orderId },
    });
    return this.toInvoiceView(
      invoice,
      this.parseLines(invoice.linesJson),
      tickets.map((t) => t.id),
    );
  }

  /**
   * PDF de entrada (RN-059: re-descargable).
   *
   * @param userId - JWT.
   * @param ticketId - UUID.
   * @returns Buffer + nombre de archivo.
   */
  async getTicketPdf(
    userId: string,
    ticketId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Entrada no encontrada: ${ticketId}`);
    }
    if (ticket.userId !== userId) {
      throw new ForbiddenException('No puedes descargar esta entrada');
    }
    const buffer = await this.pdfService.buildTicketPdf(ticket);
    return { buffer, filename: `${ticket.code}.pdf` };
  }

  /**
   * PDF de factura (RN-059).
   *
   * @param userId - JWT.
   * @param invoiceId - UUID.
   * @returns Buffer + nombre de archivo.
   */
  async getInvoicePdf(
    userId: string,
    invoiceId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura no encontrada: ${invoiceId}`);
    }
    if (invoice.userId !== userId) {
      throw new ForbiddenException('No puedes descargar esta factura');
    }
    const buffer = await this.pdfService.buildInvoicePdf(
      invoice,
      this.parseLines(invoice.linesJson),
    );
    return { buffer, filename: `${invoice.number}.pdf` };
  }

  /**
   * Escaneo en puerta: valida el QR y marca la entrada UTILIZADA (HU-024).
   *
   * Comprueba existencia, compra PAID, estado VALID y datos de función.
   * El update atómico `WHERE status = VALID` evita doble ingreso concurrente
   * (RN-102). Registra `usedAt` (RN-103) y colaborador (RN-104).
   *
   * @param staffUserId - JWT del colaborador que escanea.
   * @param qrPayload - Payload leído del QR (`MCQR-…`).
   * @returns Confirmación con película/sala/silla para el dispositivo.
   * @throws {NotFoundException} QR inexistente.
   * @throws {ConflictException} Ya usado, anulado o compra no pagada.
   */
  async validateQr(
    staffUserId: string,
    qrPayload: string,
  ): Promise<TicketValidationResult> {
    const payload = qrPayload.trim();
    const ticket = await this.ticketRepo.findOne({
      where: { qrPayload: payload },
    });
    if (!ticket) {
      throw new NotFoundException('Código QR no encontrado');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new ConflictException({
        message: 'QR ya utilizado. Ingreso denegado.',
        code: 'TICKET_ALREADY_USED',
        usedAt: ticket.usedAt?.toISOString() ?? null,
        validatedByUserId: ticket.validatedByUserId,
        ticket: {
          id: ticket.id,
          code: ticket.code,
          movieTitle: ticket.movieTitle,
          roomName: ticket.roomName,
          seatLabel: ticket.seatLabel,
          startsAt: ticket.startsAt.toISOString(),
        },
      });
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new ConflictException({
        message: 'Entrada anulada. Ingreso denegado.',
        code: 'TICKET_CANCELLED',
        ticket: { id: ticket.id, code: ticket.code },
      });
    }

    const order = await this.orderRepo.findOne({
      where: { id: ticket.orderId },
    });
    if (!order || order.status !== OrderStatus.PAID) {
      throw new ConflictException({
        message: 'La compra asociada no está pagada. Ingreso denegado.',
        code: 'ORDER_NOT_PAID',
        ticket: { id: ticket.id, code: ticket.code },
      });
    }

    const usedAt = new Date();
    const updateResult = await this.ticketRepo
      .createQueryBuilder()
      .update(Ticket)
      .set({
        status: TicketStatus.USED,
        usedAt,
        validatedByUserId: staffUserId,
      })
      .where('id = :id', { id: ticket.id })
      .andWhere('status = :status', { status: TicketStatus.VALID })
      .execute();

    if (!updateResult.affected || updateResult.affected < 1) {
      const again = await this.ticketRepo.findOne({
        where: { id: ticket.id },
      });
      throw new ConflictException({
        message: 'QR ya utilizado. Ingreso denegado.',
        code: 'TICKET_ALREADY_USED',
        usedAt: again?.usedAt?.toISOString() ?? null,
        validatedByUserId: again?.validatedByUserId ?? null,
        ticket: {
          id: ticket.id,
          code: ticket.code,
          movieTitle: ticket.movieTitle,
          roomName: ticket.roomName,
          seatLabel: ticket.seatLabel,
          startsAt: ticket.startsAt.toISOString(),
        },
      });
    }

    return {
      allowed: true,
      message: 'Ingreso autorizado',
      ticket: {
        id: ticket.id,
        code: ticket.code,
        status: TicketStatus.USED,
        movieTitle: ticket.movieTitle,
        startsAt: ticket.startsAt.toISOString(),
        cinemaName: ticket.cinemaName,
        roomName: ticket.roomName,
        seatLabel: ticket.seatLabel,
        format: ticket.format,
        language: ticket.language,
        buyerName: ticket.buyerName,
        usedAt: usedAt.toISOString(),
        validatedByUserId: staffUserId,
      },
    };
  }

  /**
   * Anula entradas VALID de una orden (HU-016 / RN-068).
   *
   * Los QR quedan inutilizables de inmediato; libera `orderTicketItemId`
   * para poder reemplazar líneas y emitir nuevas entradas (RN-069).
   *
   * @param orderId - Orden PAID (mismo número de orden).
   * @param userId - Titular.
   * @returns IDs de entradas anuladas.
   */
  async cancelValidTicketsForOrder(
    orderId: string,
    userId: string,
  ): Promise<string[]> {
    const tickets = await this.ticketRepo.find({
      where: { orderId, userId, status: TicketStatus.VALID },
    });
    if (tickets.length === 0) {
      return [];
    }
    for (const ticket of tickets) {
      ticket.status = TicketStatus.CANCELLED;
      ticket.orderTicketItemId = null;
    }
    await this.ticketRepo.save(tickets);
    return tickets.map((t) => t.id);
  }

  /**
   * Emite nuevas entradas VALID a partir de las líneas actuales de la orden.
   *
   * `POST /tickets/regenerate` (HU-016). No toca la factura original
   * (comprobante fiscal de la compra inicial); solo regenera QRs.
   *
   * @param orderId - Orden PAID con líneas de silla actualizadas.
   * @param userId - Titular (debe coincidir).
   * @returns Entradas nuevas + factura existente.
   */
  async regenerateTicketsForOrder(
    orderId: string,
    userId: string,
  ): Promise<FulfillmentDocuments> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { tickets: true, snacks: true },
    });
    if (!order) {
      throw new NotFoundException(`Orden no encontrada: ${orderId}`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('No puedes regenerar entradas de otra orden');
    }
    if (order.status !== OrderStatus.PAID) {
      throw new ConflictException(
        'Solo se regeneran entradas de órdenes PAID',
      );
    }

    const activeValid = await this.ticketRepo.count({
      where: { orderId, status: TicketStatus.VALID },
    });
    if (activeValid > 0) {
      throw new ConflictException(
        'Ya existen entradas VALID; anúlalas antes de regenerar (RN-068)',
      );
    }

    const lines = order.tickets ?? [];
    if (lines.length === 0) {
      throw new ConflictException(
        'La orden no tiene líneas de entrada para regenerar',
      );
    }

    const { buyerName } = await this.resolveBuyer(order.userId);
    const ticketEntities: Ticket[] = [];
    for (const line of lines) {
      ticketEntities.push(
        this.ticketRepo.create({
          orderId: order.id,
          orderTicketItemId: line.id,
          userId: order.userId,
          code: await this.generateUniqueTicketCode(),
          qrPayload: await this.generateUniqueQrPayload(),
          status: TicketStatus.VALID,
          ticketType: TicketType.STANDARD,
          movieTitle: line.movieTitle,
          startsAt: line.startsAt,
          cinemaName: line.cinemaName,
          roomName: line.roomName,
          seatLabel: line.seatLabel,
          format: line.format,
          language: line.language,
          buyerName,
          usedAt: null,
          validatedByUserId: null,
        }),
      );
    }
    const savedTickets = await this.ticketRepo.save(ticketEntities);
    order.ticketsGenerated = true;
    await this.orderRepo.save(order);

    const invoice = await this.invoiceRepo.findOne({ where: { orderId } });
    if (!invoice) {
      throw new ConflictException(
        'La orden no tiene factura; no se puede regenerar el paquete de documentos',
      );
    }
    return {
      tickets: savedTickets.map((t) => this.toTicketView(t, invoice.id)),
      invoice: this.toInvoiceView(
        invoice,
        this.parseLines(invoice.linesJson),
        savedTickets.map((t) => t.id),
      ),
    };
  }

  /**
   * Historial de compras para consumidores internos (p. ej. tests).
   * La vista pública vive en `GET /membership.purchaseHistory`.
   *
   * @param userId - Titular.
   * @returns Resumen de facturas emitidas.
   */
  async purchaseHistoryForUser(userId: string): Promise<
    Array<{
      invoiceId: string;
      orderId: string;
      number: string;
      total: number;
      currency: string;
      cinemaName: string | null;
      issuedAt: string;
    }>
  > {
    const invoices = await this.invoiceRepo.find({
      where: { userId },
      order: { issuedAt: 'DESC' },
      take: 50,
    });
    return invoices.map((inv) => ({
      invoiceId: inv.id,
      orderId: inv.orderId,
      number: inv.number,
      total: Number(inv.total),
      currency: inv.currency,
      cinemaName: inv.cinemaName,
      issuedAt: inv.issuedAt.toISOString(),
    }));
  }

  private async loadFulfillment(
    orderId: string,
    userId: string,
  ): Promise<FulfillmentDocuments> {
    const invoice = await this.invoiceRepo.findOne({ where: { orderId } });
    if (!invoice || invoice.userId !== userId) {
      throw new NotFoundException(
        `Factura no encontrada para la orden ${orderId}`,
      );
    }
    const tickets = await this.ticketRepo.find({ where: { orderId } });
    return {
      tickets: tickets.map((t) => this.toTicketView(t, invoice.id)),
      invoice: this.toInvoiceView(
        invoice,
        this.parseLines(invoice.linesJson),
        tickets.map((t) => t.id),
      ),
    };
  }

  private async resolveBuyer(
    userId: string,
  ): Promise<{ buyerName: string; buyerEmail: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario no encontrado: ${userId}`);
    }
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const buyerName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : user.email;
    return { buyerName, buyerEmail: user.email };
  }

  private async generateUniqueTicketCode(): Promise<string> {
    for (let i = 0; i < 8; i += 1) {
      const code = `TKT-${randomBytes(4).toString('hex').toUpperCase()}`;
      const clash = await this.ticketRepo.findOne({ where: { code } });
      if (!clash) return code;
    }
    throw new ConflictException('No se pudo generar código de entrada único');
  }

  private async generateUniqueQrPayload(): Promise<string> {
    for (let i = 0; i < 8; i += 1) {
      const qrPayload = `MCQR-${randomBytes(16).toString('hex')}`;
      const clash = await this.ticketRepo.findOne({ where: { qrPayload } });
      if (!clash) return qrPayload;
    }
    throw new ConflictException('No se pudo generar QR único (RN-057)');
  }

  private async generateUniqueInvoiceNumber(): Promise<string> {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    for (let i = 0; i < 8; i += 1) {
      const number = `FE-${day}-${randomBytes(3).toString('hex').toUpperCase()}`;
      const clash = await this.invoiceRepo.findOne({ where: { number } });
      if (!clash) return number;
    }
    throw new ConflictException('No se pudo generar número de factura único');
  }

  private async mapInvoiceIdsByOrder(
    orderIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(orderIds)];
    const map = new Map<string, string>();
    if (unique.length === 0) return map;
    const invoices = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.orderId IN (:...ids)', { ids: unique })
      .getMany();
    for (const inv of invoices) {
      map.set(inv.orderId, inv.id);
    }
    return map;
  }

  private parseLines(json: string): InvoiceLineSnapshot[] {
    try {
      return JSON.parse(json) as InvoiceLineSnapshot[];
    } catch {
      return [];
    }
  }

  private publicBaseUrl(): string {
    return (process.env.APP_PUBLIC_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }

  private toTicketView(ticket: Ticket, invoiceId: string | null): TicketView {
    const base = this.publicBaseUrl();
    return {
      id: ticket.id,
      orderId: ticket.orderId,
      invoiceId,
      code: ticket.code,
      status: ticket.status,
      ticketType: ticket.ticketType,
      movieTitle: ticket.movieTitle,
      startsAt: ticket.startsAt.toISOString(),
      cinemaName: ticket.cinemaName,
      roomName: ticket.roomName,
      seatLabel: ticket.seatLabel,
      format: ticket.format,
      language: ticket.language,
      buyerName: ticket.buyerName,
      qr: {
        payload: ticket.qrPayload,
        singleUse: true,
      },
      pdfUrl: `${base}/api/v1/tickets/${ticket.id}/pdf`,
      usedAt: ticket.usedAt?.toISOString() ?? null,
      validatedByUserId: ticket.validatedByUserId ?? null,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  private toInvoiceView(
    invoice: Invoice,
    lines: InvoiceLineSnapshot[],
    ticketIds: string[],
  ): InvoiceView {
    const base = this.publicBaseUrl();
    return {
      id: invoice.id,
      orderId: invoice.orderId,
      number: invoice.number,
      currency: invoice.currency,
      ticketsSubtotal: Number(invoice.ticketsSubtotal),
      snacksSubtotal: Number(invoice.snacksSubtotal),
      subtotal: Number(invoice.subtotal),
      membershipDiscount: Number(invoice.membershipDiscount),
      promoDiscount: Number(invoice.promoDiscount),
      giftcardAmount: Number(invoice.giftcardAmount),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      promoCode: invoice.promoCode,
      cinemaName: invoice.cinemaName,
      buyerName: invoice.buyerName,
      buyerEmail: invoice.buyerEmail,
      lines,
      termsText: invoice.termsText,
      ticketIds,
      pdfUrl: `${base}/api/v1/invoice/${invoice.id}/pdf`,
      issuedAt: invoice.issuedAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
    };
  }
}
