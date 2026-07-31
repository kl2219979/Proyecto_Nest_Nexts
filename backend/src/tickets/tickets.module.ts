import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Order } from '../payments/entities/order.entity';
import { DocumentPdfService } from './document-pdf.service';
import { Invoice } from './entities/invoice.entity';
import { Ticket } from './entities/ticket.entity';
import { InvoiceController } from './invoice.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

/**
 * Documentos digitales post-pago, acceso en puerta y regeneración (HU-014 / HU-024 / HU-016 / HU-017).
 *
 * - `GET /tickets` · `GET /tickets/:id` · `GET /tickets/:id/pdf`
 * - `POST /tickets/validate` — escaneo QR (RN-102…104)
 * - `POST /tickets/regenerate` — nuevos QR tras reprogramar (HU-016 / RN-068)
 * - `POST/GET /tickets/transfer` · `accept` — cesión (HU-017, módulo Transfer)
 * - `GET /invoice/:id` · `GET /invoice/:id/pdf`
 *
 * Generación automática al webhook APPROVED vía `fulfillPaidOrder`.
 * Reprogramación orquestada en `RescheduleModule` (HU-016).
 * Cesión orquestada en `TransferModule` (HU-017).
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Ticket, Invoice, Order, User, UserProfile]),
  ],
  controllers: [TicketsController, InvoiceController],
  providers: [TicketsService, DocumentPdfService],
  exports: [TicketsService],
})
export class TicketsModule {}
