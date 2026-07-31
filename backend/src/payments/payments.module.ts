import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { CartModule } from '../cart/cart.module';
import { GiftcardsModule } from '../giftcards/giftcards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromotionsModule } from '../promotions/promotions.module';
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
 * Tras APPROVED: tickets/factura (HU-014) + email (HU-015 / RN-064)
 * + redención de cupones (HU-026 / RN-107) + débito giftcard (HU-018).
 */
@Module({
  imports: [
    AuthModule,
    CartModule,
    SeatsModule,
    SnacksModule,
    TicketsModule,
    NotificationsModule,
    PromotionsModule,
    GiftcardsModule,
    TypeOrmModule.forFeature([
      Order,
      OrderTicketItem,
      OrderSnackItem,
      Payment,
      PaymentAudit,
      User,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayService],
  exports: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule {}
