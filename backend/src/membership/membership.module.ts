import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Membership } from './entities/membership.entity';
import { Wallet } from './entities/wallet.entity';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

/**
 * Módulo de membresía digital y billetera (HU-006).
 *
 * Expone `POST /membership/create` y exporta `MembershipService`
 * para que el registro cree la membresía automáticamente (RN-025).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Membership, Wallet, User])],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
