import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAudit } from '../auth/entities/login-audit.entity';
import { User } from '../auth/entities/user.entity';
import { CineFlashAudit } from '../cineflash/entities/cineflash-audit.entity';
import { CineFlashAuditAction } from '../cineflash/enums/cineflash.enums';
import { Giftcard } from '../giftcards/entities/giftcard.entity';
import { GiftcardStatus } from '../giftcards/enums/giftcard.enums';
import { Cinema } from '../locations/entities/cinema.entity';
import { Membership } from '../membership/entities/membership.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PromotionType } from '../promotions/enums/promotion.enums';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket.enums';
import { TicketTransfer } from '../transfer/entities/ticket-transfer.entity';
import { TicketTransferStatus } from '../transfer/enums/transfer.enums';
import type { DashboardQueryDto } from './dto/dashboard-query.dto';
import type {
  DashboardComparison,
  DashboardResponse,
  DashboardSeriesPoint,
  DashboardTopRow,
} from './dto/dashboard-response';
import { DashboardPeriod } from './enums/dashboard.enums';

/**
 * Rango UTC resuelto a partir de `period` + `from`/`to`.
 */
export interface DashboardRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  period: DashboardPeriod;
}

/**
 * Agregador de KPIs gerenciales (HU-025).
 *
 * Consolida ventas, ocupación, confitería, Cine Flash, bonos, membresías,
 * usuarios, conversión, cancelaciones y transferencias en un único payload
 * para el dashboard. Los reportes operativos del panel (`/api/admin/reports/*`)
 * siguen en HU-020; aquí el foco es el tablero ejecutivo con comparativos.
 *
 * @remarks
 * **Patrón:** Service (Facade de lectura analítica).
 * Problema que resuelve: exponer indicadores de varias tablas sin que el
 * controller conozca SQL ni el detalle de cada dominio.
 */
@Injectable()
export class AnalyticsService {
  /**
   * @param orderRepo - Órdenes de venta.
   * @param ticketRepo - Entradas digitales.
   * @param showtimeRepo - Funciones / ocupación.
   * @param cinemaRepo - Complejos (filtro ciudad).
   * @param userRepo - Usuarios.
   * @param loginAuditRepo - Logins (usuarios activos).
   * @param membershipRepo - Membresías.
   * @param giftcardRepo - Bonos.
   * @param transferRepo - Cesiones de entradas.
   * @param cineflashAuditRepo - Eventos Cine Flash.
   * @param promotionRepo - Promos CINE_FLASH vigentes.
   */
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LoginAudit)
    private readonly loginAuditRepo: Repository<LoginAudit>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Giftcard)
    private readonly giftcardRepo: Repository<Giftcard>,
    @InjectRepository(TicketTransfer)
    private readonly transferRepo: Repository<TicketTransfer>,
    @InjectRepository(CineFlashAudit)
    private readonly cineflashAuditRepo: Repository<CineFlashAudit>,
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
  ) {}

  /**
   * Arma el tablero completo (KPIs + serie + tops + comparativo).
   *
   * @param query - Filtros de período / geo / límite de rankings.
   * @returns Payload listo para gráficos y tarjetas.
   */
  async getDashboard(query: DashboardQueryDto): Promise<DashboardResponse> {
    const period = query.period ?? DashboardPeriod.MONTHLY;
    const limit = query.limit ?? 10;
    const range = this.resolveRange(period, query.from, query.to);
    const cinemaIds = await this.resolveCinemaFilter(
      query.cityId,
      query.cinemaId,
    );

    const [
      sales,
      tickets,
      occupation,
      snacks,
      cineFlash,
      giftcards,
      memberships,
      activeUsers,
      conversion,
      cancellations,
      transfers,
      series,
      moviesWithSales,
      topMovies,
      topCities,
      topCinemas,
      topSnacks,
      previousSales,
      previousTickets,
      previousOccupation,
    ] = await Promise.all([
      this.aggregateSales(range.from, range.to, cinemaIds),
      this.aggregateTickets(range.from, range.to, cinemaIds),
      this.aggregateOccupation(range.from, range.to, cinemaIds),
      this.aggregateSnacks(range.from, range.to, cinemaIds),
      this.aggregateCineFlash(range.from, range.to),
      this.aggregateGiftcards(range.from, range.to),
      this.aggregateMemberships(range.from, range.to),
      this.aggregateUsers(range.from, range.to),
      this.aggregateConversion(range.from, range.to, cinemaIds),
      this.aggregateCancellations(range.from, range.to, cinemaIds),
      this.aggregateTransfers(range.from, range.to),
      this.aggregateSeries(period, range.from, range.to, cinemaIds),
      this.countMoviesWithSales(range.from, range.to, cinemaIds),
      this.topMovies(range.from, range.to, cinemaIds, limit),
      this.topCities(range.from, range.to, cinemaIds, limit),
      this.topCinemas(range.from, range.to, cinemaIds, limit),
      this.topSnacks(range.from, range.to, cinemaIds, limit),
      this.aggregateSales(range.previousFrom, range.previousTo, cinemaIds),
      this.aggregateTickets(
        range.previousFrom,
        range.previousTo,
        cinemaIds,
      ),
      this.aggregateOccupation(
        range.previousFrom,
        range.previousTo,
        cinemaIds,
      ),
    ]);

    const comparison = this.buildComparison(range, {
      revenue: previousSales.revenue,
      ordersPaid: previousSales.ordersPaid,
      ticketsIssued: previousTickets.issued,
      occupancyPercent: previousOccupation.occupancyPercent,
    }, {
      revenue: sales.revenue,
      ordersPaid: sales.ordersPaid,
      ticketsIssued: tickets.issued,
      occupancyPercent: occupation.occupancyPercent,
    });

    return {
      meta: {
        period,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        cityId: query.cityId ?? null,
        cinemaId: query.cinemaId ?? null,
        generatedAt: new Date().toISOString(),
      },
      kpis: {
        sales,
        tickets,
        occupation,
        movies: {
          withSales: moviesWithSales,
          showtimes: occupation.showtimes,
        },
        snacks,
        cineFlash,
        giftcards,
        memberships,
        activeUsers,
        conversion,
        cancellations,
        transfers,
        revenue: {
          total: sales.revenue,
          tickets: sales.ticketsRevenue,
          snacks: sales.snacksRevenue,
          giftcardsFaceValue: giftcards.faceValueSold,
        },
      },
      series,
      tops: {
        movies: topMovies,
        cities: topCities,
        cinemas: topCinemas,
        snacks: topSnacks,
      },
      comparison,
    };
  }

  /**
   * Resuelve el intervalo UTC y el período anterior de igual duración.
   *
   * @param period - Granularidad.
   * @param fromIso - Inicio opcional YYYY-MM-DD.
   * @param toIso - Fin opcional YYYY-MM-DD.
   * @returns Rangos actual y previo.
   */
  resolveRange(
    period: DashboardPeriod,
    fromIso?: string,
    toIso?: string,
  ): DashboardRange {
    const now = new Date();
    let from: Date;
    let to: Date;

    if (fromIso || toIso) {
      from = fromIso
        ? this.startOfUtcDay(new Date(fromIso))
        : this.defaultFrom(period, now);
      to = toIso ? this.endOfUtcDay(new Date(toIso)) : now;
    } else {
      from = this.defaultFrom(period, now);
      to = now;
    }

    if (from.getTime() > to.getTime()) {
      const swap = from;
      from = this.startOfUtcDay(to);
      to = this.endOfUtcDay(swap);
    }

    const durationMs = Math.max(to.getTime() - from.getTime(), 1);
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - durationMs);

    return { from, to, previousFrom, previousTo, period };
  }

  /**
   * Inicio por defecto según período (sin `from`/`to`).
   *
   * @param period - Granularidad.
   * @param now - Referencia.
   * @returns Fecha de inicio UTC.
   */
  private defaultFrom(period: DashboardPeriod, now: Date): Date {
    switch (period) {
      case DashboardPeriod.DAILY:
        return this.startOfUtcDay(now);
      case DashboardPeriod.WEEKLY:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case DashboardPeriod.MONTHLY:
        return new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
        );
      case DashboardPeriod.YEARLY:
        return new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      default:
        return this.startOfUtcDay(now);
    }
  }

  /**
   * Lista de cines a filtrar (`null` = sin filtro geo).
   *
   * @param cityId - Ciudad opcional.
   * @param cinemaId - Complejo opcional (tiene prioridad).
   * @returns IDs o `null`.
   */
  private async resolveCinemaFilter(
    cityId?: string,
    cinemaId?: string,
  ): Promise<string[] | null> {
    if (cinemaId) return [cinemaId];
    if (!cityId) return null;
    const rows = await this.cinemaRepo.find({
      where: { cityId },
      select: ['id'],
    });
    return rows.map((c) => c.id);
  }

  /** Ventas PAID en el rango (opcionalmente por complejos). */
  private async aggregateSales(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'ordersPaid')
      .addSelect('COALESCE(SUM(o.ticketsSubtotal),0)', 'ticketsRevenue')
      .addSelect('COALESCE(SUM(o.snacksSubtotal),0)', 'snacksRevenue')
      .addSelect('COALESCE(SUM(o.giftcardAmount),0)', 'giftcardDiscountApplied')
      .addSelect('COALESCE(SUM(o.total),0)', 'revenue')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt >= :from', { from })
      .andWhere('o.createdAt <= :to', { to });

    this.applyCinemaFilter(qb, 'o', cinemaIds);

    const row = await qb.getRawOne<{
      ordersPaid: string;
      ticketsRevenue: string;
      snacksRevenue: string;
      giftcardDiscountApplied: string;
      revenue: string;
    }>();

    return {
      ordersPaid: Number(row?.ordersPaid ?? 0),
      ticketsRevenue: Number(row?.ticketsRevenue ?? 0),
      snacksRevenue: Number(row?.snacksRevenue ?? 0),
      giftcardDiscountApplied: Number(row?.giftcardDiscountApplied ?? 0),
      revenue: Number(row?.revenue ?? 0),
    };
  }

  /** Conteos de tickets por estado (vía orden + cine). */
  private async aggregateTickets(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ) {
    const params: unknown[] = [from, to];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) {
      return { issued: 0, used: 0, cancelled: 0 };
    }
    if (cinemaIds) {
      params.push(cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($${params.length}::uuid[])`;
    }

    const rows = (await this.ticketRepo.manager.query(
      `
      SELECT t.status::text AS status, COUNT(*)::int AS count
      FROM tickets t
      INNER JOIN orders o ON o.id = t."orderId"
      WHERE t."createdAt" >= $1 AND t."createdAt" <= $2
      ${cinemaSql}
      GROUP BY t.status
      `,
      params,
    )) as { status: string; count: number }[];

    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = Number(r.count);

    return {
      issued:
        (map[TicketStatus.VALID] ?? 0) +
        (map[TicketStatus.USED] ?? 0) +
        (map[TicketStatus.CANCELLED] ?? 0),
      used: map[TicketStatus.USED] ?? 0,
      cancelled: map[TicketStatus.CANCELLED] ?? 0,
    };
  }

  /** Ocupación de funciones cuyo `startsAt` cae en el rango. */
  private async aggregateOccupation(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ) {
    const qb = this.showtimeRepo
      .createQueryBuilder('s')
      .innerJoin('s.room', 'r')
      .select('COUNT(s.id)', 'showtimes')
      .addSelect('COALESCE(SUM(s.soldSeats),0)', 'soldSeats')
      .addSelect('COALESCE(SUM(r.capacity),0)', 'capacity')
      .where('s.startsAt >= :from', { from })
      .andWhere('s.startsAt <= :to', { to })
      .andWhere('s.isActive = true');

    if (cinemaIds) {
      if (cinemaIds.length === 0) {
        return {
          showtimes: 0,
          soldSeats: 0,
          capacity: 0,
          occupancyPercent: 0,
        };
      }
      qb.andWhere('r.cinemaId IN (:...cinemaIds)', { cinemaIds });
    }

    const row = await qb.getRawOne<{
      showtimes: string;
      soldSeats: string;
      capacity: string;
    }>();

    const showtimes = Number(row?.showtimes ?? 0);
    const soldSeats = Number(row?.soldSeats ?? 0);
    const capacity = Number(row?.capacity ?? 0);

    return {
      showtimes,
      soldSeats,
      capacity,
      occupancyPercent:
        capacity > 0
          ? Math.round((soldSeats / capacity) * 1000) / 10
          : 0,
    };
  }

  /** Confitería en órdenes PAID. */
  private async aggregateSnacks(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ) {
    const params: unknown[] = [OrderStatus.PAID, from, to];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) {
      return { itemsSold: 0, revenue: 0 };
    }
    if (cinemaIds) {
      params.push(cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($${params.length}::uuid[])`;
    }

    const rows = (await this.orderRepo.manager.query(
      `
      SELECT COALESCE(SUM(osi.quantity),0)::int AS "itemsSold",
             COALESCE(SUM(osi."lineTotal"),0)::float AS revenue
      FROM order_snack_items osi
      INNER JOIN orders o ON o.id = osi."orderId"
      WHERE o.status = $1
        AND o."createdAt" >= $2 AND o."createdAt" <= $3
      ${cinemaSql}
      `,
      params,
    )) as { itemsSold: number; revenue: number }[];

    const row = rows[0];
    return {
      itemsSold: Number(row?.itemsSold ?? 0),
      revenue: Number(row?.revenue ?? 0),
    };
  }

  /** Eventos Cine Flash + promos activas del tipo. */
  private async aggregateCineFlash(from: Date, to: Date) {
    const rows = await this.cineflashAuditRepo
      .createQueryBuilder('a')
      .select('a.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('a.createdAt >= :from', { from })
      .andWhere('a.createdAt <= :to', { to })
      .groupBy('a.action')
      .getRawMany<{ action: string; count: string }>();

    const map: Record<string, number> = {};
    for (const r of rows) map[r.action] = Number(r.count);

    const activePromos = await this.promotionRepo.count({
      where: {
        type: PromotionType.CINE_FLASH,
        isActive: true,
      },
    });

    return {
      activations: map[CineFlashAuditAction.ACTIVATED] ?? 0,
      deactivations: map[CineFlashAuditAction.DEACTIVATED] ?? 0,
      activePromos,
    };
  }

  /** Bonos vendidos / redimidos en el rango. */
  private async aggregateGiftcards(from: Date, to: Date) {
    const soldRow = await this.giftcardRepo
      .createQueryBuilder('g')
      .select('COUNT(*)', 'sold')
      .addSelect('COALESCE(SUM(g.faceValue),0)', 'faceValueSold')
      .addSelect('COALESCE(SUM(g.remainingBalance),0)', 'remainingBalance')
      .where('g.createdAt >= :from', { from })
      .andWhere('g.createdAt <= :to', { to })
      .andWhere('g.status IN (:...statuses)', {
        statuses: [
          GiftcardStatus.ACTIVE,
          GiftcardStatus.REDEEMED,
          GiftcardStatus.EXPIRED,
        ],
      })
      .getRawOne<{
        sold: string;
        faceValueSold: string;
        remainingBalance: string;
      }>();

    const redeemedFully = await this.giftcardRepo
      .createQueryBuilder('g')
      .where('g.updatedAt >= :from', { from })
      .andWhere('g.updatedAt <= :to', { to })
      .andWhere('g.status = :status', { status: GiftcardStatus.REDEEMED })
      .getCount();

    return {
      sold: Number(soldRow?.sold ?? 0),
      faceValueSold: Number(soldRow?.faceValueSold ?? 0),
      redeemedFully,
      remainingBalance: Number(soldRow?.remainingBalance ?? 0),
    };
  }

  /** Stock de membresías + altas en el período. */
  private async aggregateMemberships(from: Date, to: Date) {
    const byLevel = (await this.membershipRepo.manager.query(
      `
      SELECT level::text AS level, COUNT(*)::int AS count
      FROM memberships
      GROUP BY level
      ORDER BY level
      `,
    )) as { level: string; count: number }[];

    const total = byLevel.reduce((acc, r) => acc + Number(r.count), 0);
    const createdInPeriod = await this.membershipRepo
      .createQueryBuilder('m')
      .where('m.createdAt >= :from', { from })
      .andWhere('m.createdAt <= :to', { to })
      .getCount();

    return {
      total,
      createdInPeriod,
      byLevel: byLevel.map((r) => ({
        level: r.level,
        count: Number(r.count),
      })),
    };
  }

  /** Altas, verificados activos y logins exitosos en el rango. */
  private async aggregateUsers(from: Date, to: Date) {
    const registeredInPeriod = await this.userRepo
      .createQueryBuilder('u')
      .where('u.createdAt >= :from', { from })
      .andWhere('u.createdAt <= :to', { to })
      .getCount();

    const verifiedActive = await this.userRepo.count({
      where: { isActive: true, isEmailVerified: true },
    });

    const loggedInPeriodRow = await this.loginAuditRepo
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT a.userId)', 'count')
      .where('a.success = true')
      .andWhere('a.userId IS NOT NULL')
      .andWhere('a.createdAt >= :from', { from })
      .andWhere('a.createdAt <= :to', { to })
      .getRawOne<{ count: string }>();

    return {
      registeredInPeriod,
      verifiedActive,
      loggedInPeriod: Number(loggedInPeriodRow?.count ?? 0),
    };
  }

  /** Tasa de conversión de checkout. */
  private async aggregateConversion(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.createdAt >= :from', { from })
      .andWhere('o.createdAt <= :to', { to })
      .andWhere('o.status IN (:...statuses)', {
        statuses: [
          OrderStatus.PAID,
          OrderStatus.FAILED,
          OrderStatus.CANCELLED,
        ],
      })
      .groupBy('o.status');

    this.applyCinemaFilter(qb, 'o', cinemaIds);

    const rows = await qb.getRawMany<{ status: string; count: string }>();
    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = Number(r.count);

    const paid = map[OrderStatus.PAID] ?? 0;
    const failed = map[OrderStatus.FAILED] ?? 0;
    const cancelled = map[OrderStatus.CANCELLED] ?? 0;
    const denom = paid + failed + cancelled;

    return {
      paid,
      failed,
      cancelled,
      ratePercent:
        denom > 0 ? Math.round((paid / denom) * 1000) / 10 : 0,
    };
  }

  /** Cancelaciones de órdenes y tickets. */
  private async aggregateCancellations(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ) {
    const orderQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = :status', { status: OrderStatus.CANCELLED })
      .andWhere('o.createdAt >= :from', { from })
      .andWhere('o.createdAt <= :to', { to });
    this.applyCinemaFilter(orderQb, 'o', cinemaIds);
    const orders = await orderQb.getCount();

    const params: unknown[] = [TicketStatus.CANCELLED, from, to];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) {
      return { orders, tickets: 0 };
    }
    if (cinemaIds) {
      params.push(cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($${params.length}::uuid[])`;
    }

    const ticketRows = (await this.ticketRepo.manager.query(
      `
      SELECT COUNT(*)::int AS count
      FROM tickets t
      INNER JOIN orders o ON o.id = t."orderId"
      WHERE t.status = $1
        AND t."updatedAt" >= $2 AND t."updatedAt" <= $3
      ${cinemaSql}
      `,
      params,
    )) as { count: number }[];

    return {
      orders,
      tickets: Number(ticketRows[0]?.count ?? 0),
    };
  }

  /** Transferencias solicitadas / aceptadas / pendientes. */
  private async aggregateTransfers(from: Date, to: Date) {
    const rows = await this.transferRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.createdAt >= :from', { from })
      .andWhere('t.createdAt <= :to', { to })
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string }>();

    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = Number(r.count);

    const accepted = map[TicketTransferStatus.ACCEPTED] ?? 0;
    const pending = map[TicketTransferStatus.PENDING] ?? 0;
    const cancelled = map[TicketTransferStatus.CANCELLED] ?? 0;
    const expired = map[TicketTransferStatus.EXPIRED] ?? 0;

    return {
      requested: accepted + pending + cancelled + expired,
      accepted,
      pending,
    };
  }

  /** Serie temporal para gráficos (bucket según período). */
  private async aggregateSeries(
    period: DashboardPeriod,
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ): Promise<DashboardSeriesPoint[]> {
    const trunc = this.seriesTrunc(period);
    const params: unknown[] = [OrderStatus.PAID, from, to, trunc];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) return [];
    if (cinemaIds) {
      params.push(cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($${params.length}::uuid[])`;
    }

    const rows = (await this.orderRepo.manager.query(
      `
      SELECT TO_CHAR(date_trunc($4, o."createdAt" AT TIME ZONE 'UTC'),
                     CASE WHEN $4 = 'hour' THEN 'YYYY-MM-DD HH24:00'
                          WHEN $4 = 'month' THEN 'YYYY-MM'
                          ELSE 'YYYY-MM-DD' END) AS bucket,
             COUNT(*)::int AS orders,
             COALESCE(SUM(o.total),0)::float AS revenue,
             COALESCE(SUM(
               (SELECT COUNT(*) FROM order_ticket_items oti
                WHERE oti."orderId" = o.id)
             ),0)::int AS tickets
      FROM orders o
      WHERE o.status = $1
        AND o."createdAt" >= $2 AND o."createdAt" <= $3
      ${cinemaSql}
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      params,
    )) as {
      bucket: string;
      orders: number;
      revenue: number;
      tickets: number;
    }[];

    return rows.map((r) => ({
      bucket: r.bucket,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
      tickets: Number(r.tickets),
    }));
  }

  /** Cantidad de películas distintas con al menos una venta PAID. */
  private async countMoviesWithSales(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
  ): Promise<number> {
    const params: unknown[] = [OrderStatus.PAID, from, to];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) return 0;
    if (cinemaIds) {
      params.push(cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($${params.length}::uuid[])`;
    }

    const rows = (await this.orderRepo.manager.query(
      `
      SELECT COUNT(DISTINCT oti."movieId")::int AS count
      FROM order_ticket_items oti
      INNER JOIN orders o ON o.id = oti."orderId"
      WHERE o.status = $1
        AND o."createdAt" >= $2 AND o."createdAt" <= $3
      ${cinemaSql}
      `,
      params,
    )) as { count: number }[];

    return Number(rows[0]?.count ?? 0);
  }

  /** Top películas por entradas vendidas (líneas PAID). */
  private async topMovies(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
    limit: number,
  ): Promise<DashboardTopRow[]> {
    const params: unknown[] = [OrderStatus.PAID, from, to, limit];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) return [];
    if (cinemaIds) {
      params.splice(3, 0, cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($4::uuid[])`;
      params[4] = limit;
    }

    const limitIdx = cinemaIds ? 5 : 4;
    const rows = (await this.orderRepo.manager.query(
      `
      SELECT oti."movieId" AS id,
             oti."movieTitle" AS name,
             COUNT(*)::int AS value,
             COALESCE(SUM(oti."lineTotal"),0)::float AS secondary
      FROM order_ticket_items oti
      INNER JOIN orders o ON o.id = oti."orderId"
      WHERE o.status = $1
        AND o."createdAt" >= $2 AND o."createdAt" <= $3
      ${cinemaSql}
      GROUP BY oti."movieId", oti."movieTitle"
      ORDER BY value DESC
      LIMIT $${limitIdx}
      `,
      params,
    )) as { id: string; name: string; value: number; secondary: number }[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value),
      secondary: Number(r.secondary),
    }));
  }

  /** Top ciudades por ingreso (órdenes PAID → cine → ciudad). */
  private async topCities(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
    limit: number,
  ): Promise<DashboardTopRow[]> {
    const params: unknown[] = [OrderStatus.PAID, from, to, limit];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) return [];
    if (cinemaIds) {
      params.splice(3, 0, cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($4::uuid[])`;
      params[4] = limit;
    }
    const limitIdx = cinemaIds ? 5 : 4;

    const rows = (await this.orderRepo.manager.query(
      `
      SELECT c."cityId" AS id,
             ci.name AS name,
             COALESCE(SUM(o.total),0)::float AS value,
             COUNT(o.id)::int AS secondary
      FROM orders o
      INNER JOIN cinemas c ON c.id = o."cinemaId"
      INNER JOIN cities ci ON ci.id = c."cityId"
      WHERE o.status = $1
        AND o."createdAt" >= $2 AND o."createdAt" <= $3
        AND o."cinemaId" IS NOT NULL
      ${cinemaSql}
      GROUP BY c."cityId", ci.name
      ORDER BY value DESC
      LIMIT $${limitIdx}
      `,
      params,
    )) as { id: string; name: string; value: number; secondary: number }[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value),
      secondary: Number(r.secondary),
    }));
  }

  /** Top complejos por ingreso. */
  private async topCinemas(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
    limit: number,
  ): Promise<DashboardTopRow[]> {
    const params: unknown[] = [OrderStatus.PAID, from, to, limit];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) return [];
    if (cinemaIds) {
      params.splice(3, 0, cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($4::uuid[])`;
      params[4] = limit;
    }
    const limitIdx = cinemaIds ? 5 : 4;

    const rows = (await this.orderRepo.manager.query(
      `
      SELECT o."cinemaId" AS id,
             COALESCE(o."cinemaName", 'N/D') AS name,
             COALESCE(SUM(o.total),0)::float AS value,
             COUNT(o.id)::int AS secondary
      FROM orders o
      WHERE o.status = $1
        AND o."createdAt" >= $2 AND o."createdAt" <= $3
        AND o."cinemaId" IS NOT NULL
      ${cinemaSql}
      GROUP BY o."cinemaId", o."cinemaName"
      ORDER BY value DESC
      LIMIT $${limitIdx}
      `,
      params,
    )) as { id: string; name: string; value: number; secondary: number }[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value),
      secondary: Number(r.secondary),
    }));
  }

  /** Top confitería por unidades. */
  private async topSnacks(
    from: Date,
    to: Date,
    cinemaIds: string[] | null,
    limit: number,
  ): Promise<DashboardTopRow[]> {
    const params: unknown[] = [OrderStatus.PAID, from, to, limit];
    let cinemaSql = '';
    if (cinemaIds && cinemaIds.length === 0) return [];
    if (cinemaIds) {
      params.splice(3, 0, cinemaIds);
      cinemaSql = ` AND o."cinemaId" = ANY($4::uuid[])`;
      params[4] = limit;
    }
    const limitIdx = cinemaIds ? 5 : 4;

    const rows = (await this.orderRepo.manager.query(
      `
      SELECT osi."snackId" AS id,
             osi.name AS name,
             COALESCE(SUM(osi.quantity),0)::int AS value,
             COALESCE(SUM(osi."lineTotal"),0)::float AS secondary
      FROM order_snack_items osi
      INNER JOIN orders o ON o.id = osi."orderId"
      WHERE o.status = $1
        AND o."createdAt" >= $2 AND o."createdAt" <= $3
      ${cinemaSql}
      GROUP BY osi."snackId", osi.name
      ORDER BY value DESC
      LIMIT $${limitIdx}
      `,
      params,
    )) as { id: string; name: string; value: number; secondary: number }[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value),
      secondary: Number(r.secondary),
    }));
  }

  /**
   * Comparativo vs. ventana anterior (deltas %).
   *
   * @param range - Rangos actual/previo.
   * @param previous - Totales del período previo.
   * @param current - Totales del período actual.
   * @returns Bloque `comparison` del dashboard.
   */
  private buildComparison(
    range: DashboardRange,
    previous: {
      revenue: number;
      ordersPaid: number;
      ticketsIssued: number;
      occupancyPercent: number;
    },
    current: {
      revenue: number;
      ordersPaid: number;
      ticketsIssued: number;
      occupancyPercent: number;
    },
  ): DashboardComparison {
    return {
      previousFrom: range.previousFrom.toISOString(),
      previousTo: range.previousTo.toISOString(),
      previous,
      deltas: {
        revenuePercent: this.deltaPercent(previous.revenue, current.revenue),
        ordersPercent: this.deltaPercent(
          previous.ordersPaid,
          current.ordersPaid,
        ),
        ticketsPercent: this.deltaPercent(
          previous.ticketsIssued,
          current.ticketsIssued,
        ),
        occupancyPoints:
          Math.round(
            (current.occupancyPercent - previous.occupancyPercent) * 10,
          ) / 10,
      },
    };
  }

  /**
   * Variación porcentual (null si el baseline es 0).
   *
   * @param prev - Valor anterior.
   * @param curr - Valor actual.
   * @returns Porcentaje o null.
   */
  private deltaPercent(prev: number, curr: number): number | null {
    if (prev === 0) return curr === 0 ? 0 : null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  /**
   * Añade filtro de complejos a un QueryBuilder de órdenes.
   *
   * @param qb - QueryBuilder TypeORM.
   * @param alias - Alias de la entidad Order.
   * @param cinemaIds - IDs o null.
   */
  private applyCinemaFilter(
    qb: { andWhere: (sql: string, params?: object) => unknown },
    alias: string,
    cinemaIds: string[] | null,
  ): void {
    if (!cinemaIds) return;
    if (cinemaIds.length === 0) {
      qb.andWhere('1 = 0');
      return;
    }
    qb.andWhere(`${alias}.cinemaId IN (:...cinemaIds)`, { cinemaIds });
  }

  /** Truncado SQL según período (gráficos). */
  private seriesTrunc(period: DashboardPeriod): string {
    switch (period) {
      case DashboardPeriod.DAILY:
        return 'hour';
      case DashboardPeriod.YEARLY:
        return 'month';
      default:
        return 'day';
    }
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
    );
  }

  private endOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
}
