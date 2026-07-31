import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { MembershipModule } from '../membership/membership.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { Giftcard } from './entities/giftcard.entity';
import { GiftcardDeliveryJob } from './giftcard-delivery.job';
import { GiftcardsController } from './giftcards.controller';
import { GiftcardsService } from './giftcards.service';

/**
 * Bonos de regalo digitales (HU-018).
 *
 * - `POST/GET /giftcards` · `GET /giftcards/:code`
 * - `POST /giftcards/redeem` · `POST /giftcards/webhook`
 *
 * RN-076 código único · RN-077 uso parcial · RN-078 expiración ·
 * RN-079 entradas + confitería (vía `POST /cart/apply-giftcard`).
 *
 * Exporta `GiftcardsService` para carrito (preview) y pagos (consume).
 * Reusa el Adapter `PaymentGatewayService` (HMAC/AES) sin importar
 * `PaymentsModule` (evita ciclo con el débito post-compra).
 */
@Module({
  imports: [
    AuthModule,
    MembershipModule,
    NotificationsModule,
    TypeOrmModule.forFeature([Giftcard, User]),
  ],
  controllers: [GiftcardsController],
  providers: [GiftcardsService, PaymentGatewayService, GiftcardDeliveryJob],
  exports: [GiftcardsService],
})
export class GiftcardsModule {}
