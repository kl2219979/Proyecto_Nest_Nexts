import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Membership } from '../membership/entities/membership.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { PromotionRedemption } from './entities/promotion-redemption.entity';
import { Promotion } from './entities/promotion.entity';
import { PromotionsController } from './promotions.controller';
import { seedPromotions } from './promotions.seed';
import { PromotionsService } from './promotions.service';

/**
 * Módulo de promociones y cupones (HU-026).
 *
 * - Catálogo público + CRUD ADMIN en `/api/v1/promotions`
 * - CRUD auditado en `/api/admin/promotions` (controller en `AdminModule`)
 * - Motor para carrito (`apply-promo`) y precios de función (RN-038)
 * - Tipología `CINE_FLASH` + scope `showtimeId` (activación automática = HU-019)
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Promotion,
      PromotionRedemption,
      Showtime,
      Membership,
      UserProfile,
    ]),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule implements OnModuleInit {
  private readonly logger = new Logger(PromotionsModule.name);

  /**
   * @param dataSource - TypeORM.
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Siembra cupones demo si la tabla está vacía.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await seedPromotions(this.dataSource);
    this.logger.log('Promotions seed checked (demo coupons if empty)');
  }
}
