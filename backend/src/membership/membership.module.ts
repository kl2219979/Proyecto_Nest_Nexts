import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { Invoice } from '../tickets/entities/invoice.entity';
import { Membership } from './entities/membership.entity';
import { Wallet } from './entities/wallet.entity';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

/**
 * Módulo de membresía digital y billetera (HU-006 / HU-008 / HU-023 niveles).
 *
 * Expone `POST /membership/create`, `GET /membership`, `GET /membership/levels`.
 *
 * `forwardRef(AuthModule)` evita el ciclo Auth ↔ Membership.
 * `forwardRef(LoyaltyModule)` evita el ciclo Membership ↔ Loyalty (puntos).
 * `Invoice` (HU-014) alimenta `purchaseHistory` sin importar TicketsModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Membership, Wallet, User, Invoice]),
    forwardRef(() => AuthModule),
    forwardRef(() => LoyaltyModule),
  ],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
