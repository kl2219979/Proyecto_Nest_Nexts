import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { MembershipModule } from '../membership/membership.module';
import { MoviesModule } from '../movies/movies.module';
import { OrderTicketItem } from '../payments/entities/order-ticket-item.entity';
import { Order } from '../payments/entities/order.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SeatsModule } from '../seats/seats.module';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { RescheduleAudit } from './entities/reschedule-audit.entity';
import { OrdersController } from './orders.controller';
import { RescheduleService } from './reschedule.service';

/**
 * Cambio de función / reprogramación de reserva (HU-016).
 *
 * - `GET  /orders`
 * - `GET  /orders/:id/available-functions`
 * - `PUT  /orders/:id/reschedule`
 * - `POST /tickets/regenerate` (en TicketsController)
 *
 * RN-065…070: ventana 1 h, funciones futuras, invalidar QR,
 * conservar orderId, auditoría y correo.
 */
@Module({
  imports: [
    AuthModule,
    SeatsModule,
    MoviesModule,
    TicketsModule,
    MembershipModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      Order,
      OrderTicketItem,
      Ticket,
      RescheduleAudit,
      User,
    ]),
  ],
  controllers: [OrdersController],
  providers: [RescheduleService],
  exports: [RescheduleService],
})
export class RescheduleModule {}
