import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Membership } from '../membership/entities/membership.entity';
import { MembershipModule } from '../membership/membership.module';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PointLedgerEntry } from './entities/point-ledger.entity';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

/**
 * Programa de fidelización y acumulación de puntos (HU-023).
 *
 * - `GET/POST /points` · `GET /membership/levels`
 * - RN-099 vencimiento 12 meses · RN-100 promos incompatibles · RN-101 nivel auto
 * - Integración: carrito (`apply-points`) + pagos (`earnForOrder` / `consumeForOrder`)
 *
 * Exporta `LoyaltyService` sin importar Cart/Payments (evita ciclos).
 * `forwardRef(MembershipModule)` por historial en `GET /membership`.
 */
@Module({
  imports: [
    AuthModule,
    forwardRef(() => MembershipModule),
    TypeOrmModule.forFeature([PointLedgerEntry, Membership, Promotion]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
