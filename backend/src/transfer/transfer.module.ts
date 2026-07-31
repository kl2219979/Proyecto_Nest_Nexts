import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { TicketTransfer } from './entities/ticket-transfer.entity';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

/**
 * Transferencia de entradas a otro usuario (HU-017).
 *
 * - `POST /tickets/transfer`
 * - `GET  /tickets/transfer`
 * - `POST /tickets/transfer/accept`
 *
 * RN-071…075: ventana 1 h, una sola cesión, aceptación obligatoria,
 * invalidar QR, auditoría.
 *
 * Exporta `TransferService` para enlazar invitaciones tras activar cuenta.
 */
@Module({
  imports: [
    forwardRef(() => AuthModule),
    TicketsModule,
    forwardRef(() => NotificationsModule),
    TypeOrmModule.forFeature([TicketTransfer, Ticket, User]),
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
