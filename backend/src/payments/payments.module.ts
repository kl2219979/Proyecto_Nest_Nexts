import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { SeatsModule } from '../seats/seats.module';
import { SnacksModule } from '../snacks/snacks.module';
import { TicketsModule } from '../tickets/tickets.module';
import { OrderSnackItem } from './entities/order-snack-item.entity';
import { OrderTicketItem } from './entities/order-ticket-item.entity';
import { Order } from './entities/order.entity';
import { PaymentAudit } from './entities/payment-audit.entity';
import { Payment } from './entities/payment.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * Módulo de pagos seguros (HU-013).
 *
 * - `POST/GET /payments` · `GET /payments/:id` (JWT)
 * - `POST /payments/webhook` (firma HMAC)
 *
 * Tras APPROVED delega entradas/factura a `TicketsModule` (HU-014).
 */
@Module({
  imports: [
    AuthModule,
    CartModule,
    SeatsModule,
    SnacksModule,
    TicketsModule,
    TypeOrmModule.forFeature([
      Order,
      OrderTicketItem,
      OrderSnackItem,
      Payment,
      PaymentAudit,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayService],
  exports: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule {}
