import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../admin/admin.module';
import { AdminAuditInterceptor } from '../admin/interceptors/admin-audit.interceptor';
import { AuthModule } from '../auth/auth.module';
import { CineflashModule } from '../cineflash/cineflash.module';
import { GiftcardsModule } from '../giftcards/giftcards.module';
import { Cinema } from '../locations/entities/cinema.entity';
import { LocationsModule } from '../locations/locations.module';
import { MembershipModule } from '../membership/membership.module';
import { Room } from '../movies/entities/room.entity';
import { MoviesModule } from '../movies/movies.module';
import { ProfileModule } from '../profile/profile.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RescheduleModule } from '../reschedule/reschedule.module';
import { AdminApiClientsController } from './controllers/admin-api-clients.controller';
import { OAuthController } from './controllers/oauth.controller';
import { PublicCatalogController } from './controllers/public-catalog.controller';
import { PublicUserOpsController } from './controllers/public-user-ops.controller';
import { ApiClient } from './entities/api-client.entity';
import { PublicApiAuditLog } from './entities/public-api-audit-log.entity';
import { ApiClientAuthGuard } from './guards/api-client-auth.guard';
import { ApiClientRateLimitGuard } from './guards/api-client-rate-limit.guard';
import { ApiClientScopesGuard } from './guards/api-client-scopes.guard';
import { PublicApiAuditInterceptor } from './interceptors/public-api-audit.interceptor';
import { ApiClientRateLimitService } from './services/api-client-rate-limit.service';
import { ApiClientsService } from './services/api-clients.service';
import { PublicApiAuditService } from './services/public-api-audit.service';
import { PublicCatalogService } from './services/public-catalog.service';

/**
 * API pública para aplicaciones externas (HU-029).
 *
 * - Credenciales: API Key (`X-API-Key`) u OAuth 2.0 client_credentials
 * - Scopes + rate limit por cliente (RN-114…116)
 * - Auditoría de requests (RN-117)
 * - Facade `/api/v1/public/*` + `POST /oauth/token`
 * - Admin: `/api/admin/api-clients`
 *
 * @remarks
 * **Patrón:** Facade / API Gateway ligero sobre servicios de dominio.
 * Problema que resuelve: exponer un subset seguro a terceros sin
 * reimplementar cartelera, auth u órdenes.
 */
@Module({
  imports: [
    AuthModule,
    AdminModule,
    LocationsModule,
    MoviesModule,
    PromotionsModule,
    CineflashModule,
    ProfileModule,
    MembershipModule,
    RescheduleModule,
    GiftcardsModule,
    TypeOrmModule.forFeature([ApiClient, PublicApiAuditLog, Cinema, Room]),
  ],
  controllers: [
    OAuthController,
    PublicCatalogController,
    PublicUserOpsController,
    AdminApiClientsController,
  ],
  providers: [
    ApiClientsService,
    PublicApiAuditService,
    PublicApiAuditInterceptor,
    ApiClientRateLimitService,
    PublicCatalogService,
    ApiClientAuthGuard,
    ApiClientScopesGuard,
    ApiClientRateLimitGuard,
    AdminAuditInterceptor,
  ],
  exports: [ApiClientsService, PublicApiAuditService],
})
export class PublicApiModule implements OnModuleInit {
  private readonly logger = new Logger(PublicApiModule.name);

  /**
   * @param clients - Seed del cliente demo.
   */
  constructor(private readonly clients: ApiClientsService) {}

  /**
   * Siembra `mcc_demo_kiosk` si no existe.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    const demo = await this.clients.ensureDemoClient();
    if (demo) {
      this.logger.log(
        `API client demo creado: clientId=${demo.clientId} apiKey=${demo.apiKey}`,
      );
    } else {
      this.logger.log('API client demo ya existe (mcc_demo_kiosk)');
    }
  }
}
