import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Invoice } from '../tickets/entities/invoice.entity';
import { Membership } from './entities/membership.entity';
import { Wallet } from './entities/wallet.entity';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

/**
 * Módulo de membresía digital y billetera (HU-006 / HU-008).
 *
 * Expone `POST /membership/create`, `GET /membership` (JWT) y exporta
 * `MembershipService` para el registro automático (RN-025).
 *
 * `forwardRef(AuthModule)` evita el ciclo Auth ↔ Membership
 * (Auth crea la membresía; Membership protege `GET` con JWT).
 * `Invoice` (HU-014) alimenta `purchaseHistory` sin importar TicketsModule
 * (evita ciclo Auth → Membership → Tickets → Auth).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Membership, Wallet, User, Invoice]),
    forwardRef(() => AuthModule),
  ],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
