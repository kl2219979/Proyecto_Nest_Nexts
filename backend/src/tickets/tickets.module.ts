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
 * Documentos digitales post-pago y acceso en puerta (HU-014 / HU-024).
 *
 * - `GET /tickets` · `GET /tickets/:id` · `GET /tickets/:id/pdf`
 * - `POST /tickets/validate` — escaneo QR (RN-102…104)
 * - `GET /invoice/:id` · `GET /invoice/:id/pdf`
 *
 * Generación automática al webhook APPROVED vía `fulfillPaidOrder`.
 * Email con enlaces = HU-015 (integrado en Payments).
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
