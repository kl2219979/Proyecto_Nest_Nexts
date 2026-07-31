import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../payments/entities/order.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { OrderStatus, PaymentStatus } from '../../payments/enums/payment.enums';
import { Invoice } from '../../tickets/entities/invoice.entity';
import { Showtime } from '../../movies/entities/showtime.entity';
import {
  AdminPage,
  AdminPaginationQueryDto,
} from '../dto/admin-pagination.dto';

/**
 * Consulta de ventas (órdenes / pagos / facturas) + reportes (HU-020).
 *
 * KPIs gerenciales profundos = HU-025; aquí lo operativo del panel.
 */
@Injectable()
export class AdminSalesService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
  ) {}

  /**
   * @param query - Paginación.
   * @param status - Filtro de estado.
   * @returns Órdenes.
   */
  async listOrders(
    query: AdminPaginationQueryDto,
    status?: OrderStatus,
  ): Promise<AdminPage<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (status) qb.andWhere('o.status = :status', { status });
    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  /**
   * @param id - UUID orden.
   * @returns Orden con ítems.
   */
  async getOrder(id: string): Promise<Order | null> {
    return this.orderRepo.findOne({ where: { id } });
  }

  /**
   * @param query - Paginación.
   * @returns Pagos.
   */
  async listPayments(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPage<Payment>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [items, total] = await this.paymentRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, page, limit, total };
  }

  /**
   * @param query - Paginación.
   * @returns Facturas.
   */
  async listInvoices(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPage<Invoice>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [items, total] = await this.invoiceRepo.findAndCount({
      order: { issuedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, page, limit, total };
  }

  /**
   * Ventas diarias (órdenes PAID agregadas por día).
   *
   * @param from - ISO date inclusive.
   * @param to - ISO date inclusive.
   * @returns Serie diaria.
   */
  async reportDailySales(
    from?: string,
    to?: string,
  ): Promise<
    { day: string; orders: number; ticketsTotal: number; snacksTotal: number; grandTotal: number }[]
  > {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(o.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.ticketsSubtotal),0)', 'ticketsTotal')
      .addSelect('COALESCE(SUM(o.snacksSubtotal),0)', 'snacksTotal')
      .addSelect('COALESCE(SUM(o.total),0)', 'grandTotal')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .groupBy('day')
      .orderBy('day', 'ASC');

    if (from) qb.andWhere('o.createdAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('o.createdAt < :to', { to: this.endOfDay(to) });

    const rows = await qb.getRawMany<{
      day: string;
      orders: string;
      ticketsTotal: string;
      snacksTotal: string;
      grandTotal: string;
    }>();

    return rows.map((r) => ({
      day: r.day,
      orders: Number(r.orders),
      ticketsTotal: Number(r.ticketsTotal),
      snacksTotal: Number(r.snacksTotal),
      grandTotal: Number(r.grandTotal),
    }));
  }

  /**
   * Ocupación por sala (soldSeats / capacity) en funciones futuras activas.
   *
   * @returns Filas de ocupación.
   */
  async reportOccupationByRoom(): Promise<
    {
      roomId: string;
      roomName: string;
      cinemaId: string;
      capacity: number;
      showtimes: number;
      soldSeats: number;
      occupancyPercent: number;
    }[]
  > {
    const rows = await this.showtimeRepo
      .createQueryBuilder('s')
      .innerJoin('s.room', 'r')
      .select('r.id', 'roomId')
      .addSelect('r.name', 'roomName')
      .addSelect('r.cinemaId', 'cinemaId')
      .addSelect('r.capacity', 'capacity')
      .addSelect('COUNT(s.id)', 'showtimes')
      .addSelect('COALESCE(SUM(s.soldSeats),0)', 'soldSeats')
      .where('s.isActive = true')
      .andWhere('s.startsAt > NOW()')
      .groupBy('r.id')
      .addGroupBy('r.name')
      .addGroupBy('r.cinemaId')
      .addGroupBy('r.capacity')
      .getRawMany<{
        roomId: string;
        roomName: string;
        cinemaId: string;
        capacity: string;
        showtimes: string;
        soldSeats: string;
      }>();

    return rows.map((r) => {
      const capacity = Number(r.capacity);
      const showtimes = Number(r.showtimes);
      const soldSeats = Number(r.soldSeats);
      const denom = capacity * Math.max(showtimes, 1);
      return {
        roomId: r.roomId,
        roomName: r.roomName,
        cinemaId: r.cinemaId,
        capacity,
        showtimes,
        soldSeats,
        occupancyPercent:
          denom > 0 ? Math.round((soldSeats / denom) * 1000) / 10 : 0,
      };
    });
  }

  /**
   * Películas más vendidas (por soldSeats en funciones).
   *
   * @param limit - Top N.
   * @returns Ranking.
   */
  async reportTopMovies(limit = 10): Promise<
    { movieId: string; title: string; soldSeats: number; showtimes: number }[]
  > {
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.showtimeRepo
      .createQueryBuilder('s')
      .innerJoin('s.movie', 'm')
      .select('m.id', 'movieId')
      .addSelect('m.title', 'title')
      .addSelect('COALESCE(SUM(s.soldSeats),0)', 'soldSeats')
      .addSelect('COUNT(s.id)', 'showtimes')
      .groupBy('m.id')
      .addGroupBy('m.title')
      .orderBy('"soldSeats"', 'DESC')
      .limit(take)
      .getRawMany<{
        movieId: string;
        title: string;
        soldSeats: string;
        showtimes: string;
      }>();

    return rows.map((r) => ({
      movieId: r.movieId,
      title: r.title,
      soldSeats: Number(r.soldSeats),
      showtimes: Number(r.showtimes),
    }));
  }

  /**
   * Confitería más vendida (ítems en órdenes PAID).
   *
   * @param limit - Top N.
   * @returns Ranking.
   */
  async reportTopSnacks(limit = 10): Promise<
    { snackId: string; name: string; quantity: number; revenue: number }[]
  > {
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.orderRepo.manager.query(
      `
      SELECT osi."snackId" AS "snackId",
             osi.name AS name,
             COALESCE(SUM(osi.quantity), 0)::int AS quantity,
             COALESCE(SUM(osi."lineTotal"), 0)::float AS revenue
      FROM order_snack_items osi
      INNER JOIN orders o ON o.id = osi."orderId"
      WHERE o.status = $1
      GROUP BY osi."snackId", osi.name
      ORDER BY quantity DESC
      LIMIT $2
      `,
      [OrderStatus.PAID, take],
    );

    return (rows as { snackId: string; name: string; quantity: number; revenue: number }[]).map(
      (r) => ({
        snackId: r.snackId,
        name: r.name,
        quantity: Number(r.quantity),
        revenue: Number(r.revenue),
      }),
    );
  }

  /**
   * Resumen de membresías por nivel.
   *
   * @returns Conteos.
   */
  async reportMemberships(): Promise<{ level: string; count: number }[]> {
    const rows = await this.orderRepo.manager.query(
      `
      SELECT level::text AS level, COUNT(*)::int AS count
      FROM memberships
      GROUP BY level
      ORDER BY level
      `,
    );
    return rows as { level: string; count: number }[];
  }

  /**
   * Exportación CSV de ventas diarias (criterio “exportación”).
   *
   * @param from - Desde.
   * @param to - Hasta.
   * @returns Texto CSV.
   */
  async exportDailySalesCsv(from?: string, to?: string): Promise<string> {
    const rows = await this.reportDailySales(from, to);
    const header = 'day,orders,ticketsTotal,snacksTotal,grandTotal';
    const lines = rows.map(
      (r) =>
        `${r.day},${r.orders},${r.ticketsTotal},${r.snacksTotal},${r.grandTotal}`,
    );
    return [header, ...lines].join('\n');
  }

  /** @returns Conteos rápidos de pagos por estado. */
  async paymentStatusSummary(): Promise<Record<string, number>> {
    const rows = await this.paymentRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.status')
      .getRawMany<{ status: PaymentStatus; count: string }>();
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = Number(r.count);
    return out;
  }

  private endOfDay(isoDate: string): Date {
    const d = new Date(isoDate);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }
}
