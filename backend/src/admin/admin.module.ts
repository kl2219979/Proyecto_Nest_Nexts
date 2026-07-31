import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { Country } from '../locations/entities/country.entity';
import { Department } from '../locations/entities/department.entity';
import { LocationsModule } from '../locations/locations.module';
import { Membership } from '../membership/entities/membership.entity';
import { MembershipModule } from '../membership/membership.module';
import { MembershipService } from '../membership/membership.service';
import { CastMember } from '../movies/entities/cast-member.entity';
import { Genre } from '../movies/entities/genre.entity';
import { MovieCityRelease } from '../movies/entities/movie-city-release.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Room } from '../movies/entities/room.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { MoviesModule } from '../movies/movies.module';
import { Order } from '../payments/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PromotionsModule } from '../promotions/promotions.module';
import { Seat } from '../seats/entities/seat.entity';
import { Snack } from '../snacks/entities/snack.entity';
import { Invoice } from '../tickets/entities/invoice.entity';
import { seedAdminUsers } from './admin.seed';
import { AdminContentController } from './controllers/admin-content.controller';
import { AdminGeoController } from './controllers/admin-geo.controller';
import { AdminOpsController } from './controllers/admin-ops.controller';
import { AdminPromotionsController } from './controllers/admin-promotions.controller';
import { AdminVenuesController } from './controllers/admin-venues.controller';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminAuditInterceptor } from './interceptors/admin-audit.interceptor';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminCatalogService } from './services/admin-catalog.service';
import { AdminContentService } from './services/admin-content.service';
import { AdminSalesService } from './services/admin-sales.service';
import { AdminUsersService } from './services/admin-users.service';

/**
 * Panel administrativo / backoffice (HU-020).
 *
 * Expone CRUD bajo `/api/admin/*` con JWT + RBAC (RN-088) y auditoría (RN-087).
 *
 * @remarks
 * Promociones formales: CRUD en `AdminPromotionsController` (HU-026).
 * Cine Flash automático = HU-019. KPIs gerenciales = HU-025 (`/api/v1/dashboard`).
 */
@Module({
  imports: [
    AuthModule,
    LocationsModule,
    MoviesModule,
    MembershipModule,
    PromotionsModule,
    TypeOrmModule.forFeature([
      AdminAuditLog,
      Country,
      Department,
      City,
      Cinema,
      Room,
      Seat,
      Movie,
      Genre,
      CastMember,
      MovieCityRelease,
      Showtime,
      Snack,
      User,
      UserProfile,
      NotificationPreference,
      Membership,
      Order,
      Payment,
      Invoice,
    ]),
  ],
  controllers: [
    AdminGeoController,
    AdminVenuesController,
    AdminContentController,
    AdminOpsController,
    AdminPromotionsController,
  ],
  providers: [
    AdminAuditService,
    AdminAuditInterceptor,
    AdminCatalogService,
    AdminContentService,
    AdminUsersService,
    AdminSalesService,
  ],
  exports: [AdminAuditService],
})
export class AdminModule implements OnModuleInit {
  private readonly logger = new Logger(AdminModule.name);

  /**
   * @param dataSource - TypeORM.
   * @param membershipService - Alta de membresía en seed.
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly membershipService: MembershipService,
  ) {}

  /**
   * Siembra admin@ / staff@ si no existen.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await seedAdminUsers(this.dataSource, this.membershipService);
    this.logger.log('Admin seed checked (SUPER_ADMIN / STAFF demo if missing)');
  }
}
