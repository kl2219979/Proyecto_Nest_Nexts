import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GiftcardsModule } from '../giftcards/giftcards.module';
import { MembershipModule } from '../membership/membership.module';
import { Showtime } from '../movies/entities/showtime.entity';
import { PromotionsModule } from '../promotions/promotions.module';
import { SeatsModule } from '../seats/seats.module';
import { SnacksModule } from '../snacks/snacks.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartSnackItem } from './entities/cart-snack-item.entity';
import { CartTicketItem } from './entities/cart-ticket-item.entity';
import { Cart } from './entities/cart.entity';

/**
 * Módulo del carrito de compras (HU-011 + snacks HU-012 + promos HU-026 + giftcards HU-018).
 *
 * Endpoints JWT bajo `/api/v1/cart`:
 * CRUD + apply-* + POST/PUT/DELETE snacks.
 *
 * Depende de `SeatsModule`, `MembershipModule`, `SnacksModule`,
 * `PromotionsModule` y `GiftcardsModule`.
 */
@Module({
  imports: [
    AuthModule,
    SeatsModule,
    MembershipModule,
    SnacksModule,
    PromotionsModule,
    GiftcardsModule,
    TypeOrmModule.forFeature([
      Cart,
      CartTicketItem,
      CartSnackItem,
      Showtime,
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
