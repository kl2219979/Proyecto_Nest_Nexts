import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MembershipModule } from '../membership/membership.module';
import { Showtime } from '../movies/entities/showtime.entity';
import { SeatsModule } from '../seats/seats.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartSnackItem } from './entities/cart-snack-item.entity';
import { CartTicketItem } from './entities/cart-ticket-item.entity';
import { Cart } from './entities/cart.entity';

/**
 * Módulo del carrito de compras (HU-011).
 *
 * Endpoints JWT bajo `/api/v1/cart`:
 * CRUD + apply-membership + apply-promo.
 *
 * Depende de `SeatsModule` (locks) y `MembershipModule` (RN-047).
 */
@Module({
  imports: [
    AuthModule,
    SeatsModule,
    MembershipModule,
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
