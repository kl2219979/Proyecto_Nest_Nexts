import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket.enums';
import { EmailService } from './email.service';

/**
 * Ventana ±15 min alrededor del umbral (el cron corre cada 5 min).
 */
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Job de recordatorios de función (HU-015).
 *
 * Cada 5 minutos busca órdenes PAID cuya función esté a ~24 h o ~2 h
 * y dispara el correo transaccional correspondiente (una vez por orden).
 *
 * @remarks
 * **Patrón:** Scheduled Job (cron).
 * Problema que resuelve: disparar recordatorios sin acoplar tickets a un
 * scheduler externo; Nest Schedule invoca el método periódicamente.
 */
@Injectable()
export class ShowtimeReminderJob {
  private readonly logger = new Logger(ShowtimeReminderJob.name);

  /**
   * @param ticketRepo - Entradas VALID con `startsAt`.
   * @param orderRepo - Órdenes PAID.
   * @param userRepo - Email del comprador.
   * @param emailService - Motor de correo.
   */
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Cron cada 5 minutos: recordatorios 24 h y 2 h.
   *
   * @returns Resumen de envíos.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReminders(): Promise<{ sent24h: number; sent2h: number }> {
    const sent24h = await this.dispatchForHorizon(24);
    const sent2h = await this.dispatchForHorizon(2);
    if (sent24h + sent2h > 0) {
      this.logger.log(
        `Recordatorios enviados: 24h=${sent24h} 2h=${sent2h}`,
      );
    }
    return { sent24h, sent2h };
  }

  /**
   * Busca órdenes cuya función cae en la ventana del horizonte.
   *
   * @param hoursBefore - 24 o 2.
   * @returns Cantidad de correos disparados.
   */
  async dispatchForHorizon(hoursBefore: 24 | 2): Promise<number> {
    const now = Date.now();
    const target = now + hoursBefore * 60 * 60 * 1000;
    const from = new Date(target - WINDOW_MS);
    const to = new Date(target + WINDOW_MS);

    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.status = :status', { status: TicketStatus.VALID })
      .andWhere('t.startsAt BETWEEN :from AND :to', { from, to })
      .orderBy('t.startsAt', 'ASC')
      .getMany();

    const byOrder = new Map<string, Ticket>();
    for (const ticket of tickets) {
      if (!byOrder.has(ticket.orderId)) {
        byOrder.set(ticket.orderId, ticket);
      }
    }

    let sent = 0;
    for (const [orderId, sample] of byOrder) {
      if (await this.emailService.hasReminder(orderId, hoursBefore)) {
        continue;
      }

      const order = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!order || order.status !== OrderStatus.PAID) {
        continue;
      }

      const user = await this.userRepo.findOne({
        where: { id: order.userId },
      });
      if (!user) {
        continue;
      }

      await this.emailService.sendShowtimeReminder({
        userId: user.id,
        email: user.email,
        orderId,
        hoursBefore,
        movieTitle: sample.movieTitle,
        startsAt: sample.startsAt.toISOString(),
        cinemaName: sample.cinemaName,
        roomName: sample.roomName,
      });
      sent += 1;
    }

    return sent;
  }
}
