import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { MembershipService } from '../membership/membership.service';
import { ShowtimesService } from '../movies/showtimes.service';
import { OrderTicketItem } from '../payments/entities/order-ticket-item.entity';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { EmailService } from '../notifications/email.service';
import { SeatsService } from '../seats/seats.service';
import { TicketStatus } from '../tickets/enums/ticket.enums';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketsService } from '../tickets/tickets.service';
import {
  AvailableFunctionsForOrderResponse,
  PaidOrderSummary,
  PaidOrdersListResponse,
  RescheduleResult,
} from './dto/reschedule-response';
import { RescheduleOrderDto } from './dto/reschedule.dto';
import { RescheduleAudit } from './entities/reschedule-audit.entity';

/** Ventana mínima antes del inicio para permitir cambio (RN-065): 1 hora. */
export const RESCHEDULE_MIN_LEAD_MS = 60 * 60 * 1000;

/**
 * Reprogramación de reserva / cambio de función (HU-016).
 *
 * Flujo: Mis compras → funciones alternativas → lock sillas nuevas →
 * confirmar → invalidar QR → regenerar entradas → correo + auditoría.
 *
 * RN-065…070. Conserva `Order.id` (RN-069).
 *
 * Separado de `TicketsService` (documentos) y `PaymentsService` (cobro)
 * por responsabilidad única (SOLID — SRP).
 */
@Injectable()
export class RescheduleService {
  /**
   * @param orderRepo - Órdenes PAID.
   * @param ticketItemRepo - Líneas de silla de la orden.
   * @param ticketRepo - Entradas digitales.
   * @param auditRepo - Auditoría de cambios (RN-070).
   * @param userRepo - Email del comprador.
   * @param seatsService - Liberar SOLD / confirmar nuevos locks.
   * @param showtimesService - Funciones alternativas (HU-009).
   * @param ticketsService - Anular + regenerar QR.
   * @param membershipService - Saldo a favor / débito de excedente.
   * @param emailService - Correo FUNCTION_CHANGED.
   * @param dataSource - Transacción de reemplazo de líneas.
   */
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderTicketItem)
    private readonly ticketItemRepo: Repository<OrderTicketItem>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(RescheduleAudit)
    private readonly auditRepo: Repository<RescheduleAudit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly seatsService: SeatsService,
    private readonly showtimesService: ShowtimesService,
    private readonly ticketsService: TicketsService,
    private readonly membershipService: MembershipService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * `GET /orders`: compras PAID del usuario (Mis compras / reservas).
   *
   * @param userId - JWT.
   * @returns Órdenes con elegibilidad de reprogramación (RN-065).
   */
  async listPaidOrders(userId: string): Promise<PaidOrdersListResponse> {
    const orders = await this.orderRepo.find({
      where: { userId, status: OrderStatus.PAID },
      relations: { tickets: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const items: PaidOrderSummary[] = [];
    for (const order of orders) {
      const validTickets = await this.ticketRepo.find({
        where: { orderId: order.id, userId, status: TicketStatus.VALID },
      });
      const lines = order.tickets ?? [];
      const first = lines[0];
      const eligibility = this.evaluateEligibility(
        first?.startsAt ?? null,
        validTickets.length,
      );

      items.push({
        orderId: order.id,
        status: order.status,
        movieId: first?.movieId ?? '',
        movieTitle: first?.movieTitle ?? validTickets[0]?.movieTitle ?? '',
        showtimeId: order.showtimeId,
        startsAt: (first?.startsAt ?? validTickets[0]?.startsAt)?.toISOString() ?? '',
        cinemaName: order.cinemaName,
        format: first?.format ?? validTickets[0]?.format ?? '',
        language: first?.language ?? validTickets[0]?.language ?? '',
        seatCount: lines.length,
        seats: lines.map((l) => ({
          seatId: l.seatId,
          seatLabel: l.seatLabel,
        })),
        ticketsSubtotal: Number(order.ticketsSubtotal),
        total: Number(order.total),
        currency: order.currency,
        canReschedule: eligibility.ok,
        rescheduleBlockedReason: eligibility.reason,
        validTicketCount: validTickets.length,
        createdAt: order.createdAt.toISOString(),
      });
    }

    return { items, total: items.length };
  }

  /**
   * `GET /orders/:id`: detalle de una compra PAID del usuario (HU-029).
   *
   * @param userId - JWT.
   * @param orderId - UUID de la orden.
   */
  async getPaidOrderById(
    userId: string,
    orderId: string,
  ): Promise<PaidOrderSummary> {
    const order = await this.loadOwnedPaidOrder(userId, orderId);
    const validTickets = await this.ticketRepo.find({
      where: { orderId: order.id, userId, status: TicketStatus.VALID },
    });
    const lines = order.tickets ?? [];
    const first = lines[0];
    const eligibility = this.evaluateEligibility(
      first?.startsAt ?? null,
      validTickets.length,
    );

    return {
      orderId: order.id,
      status: order.status,
      movieId: first?.movieId ?? '',
      movieTitle: first?.movieTitle ?? validTickets[0]?.movieTitle ?? '',
      showtimeId: order.showtimeId,
      startsAt:
        (first?.startsAt ?? validTickets[0]?.startsAt)?.toISOString() ?? '',
      cinemaName: order.cinemaName,
      format: first?.format ?? validTickets[0]?.format ?? '',
      language: first?.language ?? validTickets[0]?.language ?? '',
      seatCount: lines.length,
      seats: lines.map((l) => ({
        seatId: l.seatId,
        seatLabel: l.seatLabel,
      })),
      ticketsSubtotal: Number(order.ticketsSubtotal),
      total: Number(order.total),
      currency: order.currency,
      canReschedule: eligibility.ok,
      rescheduleBlockedReason: eligibility.reason,
      validTicketCount: validTickets.length,
      createdAt: order.createdAt.toISOString(),
    };
  }

  /**
   * `GET /orders/:id/available-functions`: misma película, futuras (RN-066).
   *
   * @param userId - JWT.
   * @param orderId - Orden PAID.
   * @param cityId - Contexto de ciudad (HU-009).
   */
  async listAvailableFunctions(
    userId: string,
    orderId: string,
    cityId: string,
  ): Promise<AvailableFunctionsForOrderResponse> {
    const order = await this.loadOwnedPaidOrder(userId, orderId);
    const lines = order.tickets ?? [];
    const movieId = lines[0]?.movieId;
    if (!movieId) {
      throw new ConflictException('La orden no tiene entradas asociadas');
    }

    const validCount = await this.ticketRepo.count({
      where: { orderId, userId, status: TicketStatus.VALID },
    });
    const eligibility = this.evaluateEligibility(
      lines[0]?.startsAt ?? null,
      validCount,
    );

    const functions = await this.showtimesService.listFunctionsForMovie(
      movieId,
      { cityId, available: true },
    );

    /** Excluye la función actual; solo futuras (RN-066 / RN-067). */
    functions.functions = functions.functions.filter(
      (fn) => fn.id !== order.showtimeId,
    );

    return {
      orderId: order.id,
      movieId,
      currentShowtimeId: order.showtimeId,
      canReschedule: eligibility.ok,
      rescheduleBlockedReason: eligibility.reason,
      functions,
    };
  }

  /**
   * `PUT /orders/:id/reschedule`: confirma el cambio de función.
   *
   * @param userId - JWT.
   * @param orderId - Orden PAID (se conserva el id — RN-069).
   * @param dto - Nueva función + reserva temporal de sillas.
   */
  async reschedule(
    userId: string,
    orderId: string,
    dto: RescheduleOrderDto,
  ): Promise<RescheduleResult> {
    const order = await this.loadOwnedPaidOrder(userId, orderId);
    const oldLines = [...(order.tickets ?? [])];
    if (oldLines.length === 0) {
      throw new ConflictException('La orden no tiene líneas de entrada');
    }

    const validTickets = await this.ticketRepo.find({
      where: { orderId, userId, status: TicketStatus.VALID },
    });
    const eligibility = this.evaluateEligibility(
      oldLines[0]!.startsAt,
      validTickets.length,
    );
    if (!eligibility.ok) {
      throw new ConflictException(eligibility.reason ?? 'No se puede reprogramar');
    }

    if (dto.newShowtimeId === order.showtimeId) {
      throw new BadRequestException(
        'La nueva función debe ser distinta a la actual',
      );
    }

    const usedCount = await this.ticketRepo.count({
      where: { orderId, userId, status: TicketStatus.USED },
    });
    if (usedCount > 0) {
      throw new ConflictException(
        'No se puede reprogramar: alguna entrada ya fue usada en puerta',
      );
    }

    const locks = await this.seatsService.getLockedReservation(
      userId,
      dto.reservationId,
    );
    if (locks[0]!.showtimeId !== dto.newShowtimeId) {
      throw new BadRequestException(
        'La reserva temporal no corresponde a newShowtimeId',
      );
    }
    if (locks.length !== oldLines.length) {
      throw new BadRequestException(
        `Debes seleccionar exactamente ${oldLines.length} silla(s) (misma cantidad)`,
      );
    }

    const newShowtime = locks[0]!.showtime;
    if (!newShowtime?.isActive) {
      throw new ConflictException('La nueva función no está activa (RN-066)');
    }
    if (newShowtime.startsAt.getTime() <= Date.now()) {
      throw new ConflictException(
        'Solo se puede cambiar a funciones futuras (RN-066 / RN-067)',
      );
    }
    if (newShowtime.movieId !== oldLines[0]!.movieId) {
      throw new BadRequestException(
        'La nueva función debe ser de la misma película',
      );
    }

    const unitPrice = Number(newShowtime.price);
    const newTicketsSubtotal = unitPrice * locks.length;
    const oldTicketsSubtotal = Number(order.ticketsSubtotal);
    const priceDifference = Number(
      (newTicketsSubtotal - oldTicketsSubtotal).toFixed(2),
    );

    let creditApplied = 0;
    let surchargeAmount = 0;
    let walletBalance: string | null = null;
    const payFromWallet = dto.paySurchargeFromWallet === true;

    if (priceDifference < 0) {
      creditApplied = Number((-priceDifference).toFixed(2));
      walletBalance = await this.membershipService.creditWallet(
        userId,
        creditApplied,
      );
    } else if (priceDifference > 0) {
      surchargeAmount = priceDifference;
      if (payFromWallet) {
        walletBalance = await this.membershipService.debitWallet(
          userId,
          surchargeAmount,
        );
      }
    }

    const oldSeatIds = oldLines.map((l) => l.seatId);
    const oldShowtimeId = order.showtimeId;
    const oldReservationId = order.reservationId;

    const cancelledTicketIds =
      await this.ticketsService.cancelValidTicketsForOrder(orderId, userId);

    await this.seatsService.releaseSoldSeats(
      userId,
      oldReservationId,
      oldSeatIds,
    );

    const newSeatIds = locks.map((l) => l.seatId);
    await this.seatsService.confirmReservationSold(
      userId,
      dto.reservationId,
      newSeatIds,
    );

    const cinemaName = newShowtime.room?.cinema?.name ?? order.cinemaName;
    const roomName = newShowtime.room?.name ?? oldLines[0]!.roomName;
    const movieTitle =
      newShowtime.movie?.title ?? oldLines[0]!.movieTitle;

    await this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(OrderTicketItem);
      const orderRepo = manager.getRepository(Order);

      await itemRepo.delete({ orderId });

      const newItems = locks.map((lock) =>
        itemRepo.create({
          orderId,
          seatId: lock.seatId,
          seatLabel: lock.seat.label,
          movieId: newShowtime.movieId,
          movieTitle,
          startsAt: newShowtime.startsAt,
          roomName,
          cinemaName: cinemaName ?? '',
          format: newShowtime.format,
          language: newShowtime.language,
          unitPrice,
          membershipDiscount: 0,
          lineTotal: unitPrice,
        }),
      );
      await itemRepo.save(newItems);

      const snacksSubtotal = Number(order.snacksSubtotal);
      const membershipDiscount = Number(order.membershipDiscount);
      const promoDiscount = Number(order.promoDiscount);
      const giftcardAmount = Number(order.giftcardAmount);
      const tax = Number(order.tax);
      const subtotal = newTicketsSubtotal + snacksSubtotal;
      const total = Number(
        (
          subtotal -
          membershipDiscount -
          promoDiscount -
          giftcardAmount +
          tax
        ).toFixed(2),
      );

      await orderRepo.update(
        { id: orderId },
        {
          showtimeId: dto.newShowtimeId,
          reservationId: dto.reservationId,
          cinemaId: newShowtime.room?.cinemaId ?? order.cinemaId,
          cinemaName,
          ticketsSubtotal: newTicketsSubtotal,
          subtotal,
          total,
        },
      );
    });

    const docs = await this.ticketsService.regenerateTicketsForOrder(
      orderId,
      userId,
    );

    const audit = await this.auditRepo.save(
      this.auditRepo.create({
        orderId,
        userId,
        oldShowtimeId,
        newShowtimeId: dto.newShowtimeId,
        oldSnapshotJson: JSON.stringify({
          seats: oldLines.map((l) => ({
            seatId: l.seatId,
            seatLabel: l.seatLabel,
          })),
          ticketIds: cancelledTicketIds,
          startsAt: oldLines[0]!.startsAt.toISOString(),
          ticketsSubtotal: oldTicketsSubtotal,
        }),
        newSnapshotJson: JSON.stringify({
          seats: locks.map((l) => ({
            seatId: l.seatId,
            seatLabel: l.seat.label,
          })),
          ticketIds: docs.tickets.map((t) => t.id),
          startsAt: newShowtime.startsAt.toISOString(),
          ticketsSubtotal: newTicketsSubtotal,
        }),
        priceDifference,
        creditApplied,
        surchargeAmount,
      }),
    );

    await this.dispatchFunctionChangedEmail(userId, {
      orderId,
      movieTitle,
      oldStartsAt: oldLines[0]!.startsAt.toISOString(),
      newStartsAt: newShowtime.startsAt.toISOString(),
      priceDifference,
      creditApplied,
      surchargeAmount,
    });

    return {
      orderId,
      oldShowtimeId,
      newShowtimeId: dto.newShowtimeId,
      priceDifference,
      creditApplied,
      surchargeAmount,
      walletBalance,
      cancelledTicketIds,
      tickets: docs.tickets,
      auditId: audit.id,
      message:
        surchargeAmount > 0 && !payFromWallet
          ? 'Cambio confirmado; excedente registrado (cobro de billetera no solicitado)'
          : 'Cambio de función confirmado; nuevos QR emitidos (RN-068/069)',
    };
  }

  /**
   * Evalúa RN-065 / RN-067 y presencia de entradas VALID.
   */
  private evaluateEligibility(
    startsAt: Date | null,
    validTicketCount: number,
  ): { ok: boolean; reason: string | null } {
    if (validTicketCount === 0) {
      return {
        ok: false,
        reason: 'No hay entradas VALID para reprogramar',
      };
    }
    if (!startsAt) {
      return { ok: false, reason: 'La orden no tiene horario de función' };
    }
    const msUntil = startsAt.getTime() - Date.now();
    if (msUntil <= 0) {
      return {
        ok: false,
        reason: 'No se pueden cambiar funciones ya iniciadas (RN-067)',
      };
    }
    if (msUntil < RESCHEDULE_MIN_LEAD_MS) {
      return {
        ok: false,
        reason:
          'El cambio solo es posible hasta 1 hora antes del inicio (RN-065)',
      };
    }
    return { ok: true, reason: null };
  }

  private async loadOwnedPaidOrder(
    userId: string,
    orderId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { tickets: true },
    });
    if (!order) {
      throw new NotFoundException(`Orden no encontrada: ${orderId}`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('No puedes gestionar esta orden');
    }
    if (order.status !== OrderStatus.PAID) {
      throw new ConflictException('Solo se reprograman compras PAID');
    }
    return order;
  }

  private async dispatchFunctionChangedEmail(
    userId: string,
    params: {
      orderId: string;
      movieTitle: string;
      oldStartsAt: string;
      newStartsAt: string;
      priceDifference: number;
      creditApplied: number;
      surchargeAmount: number;
    },
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;
    try {
      await this.emailService.sendFunctionChanged({
        userId,
        email: user.email,
        orderId: params.orderId,
        movieTitle: params.movieTitle,
        oldStartsAt: params.oldStartsAt,
        newStartsAt: params.newStartsAt,
        priceDifference: params.priceDifference.toFixed(2),
        creditApplied: params.creditApplied.toFixed(2),
        surchargeAmount: params.surchargeAmount.toFixed(2),
      });
    } catch {
      /** El cambio de función no falla si el correo no se envía. */
    }
  }
}