import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/validate-env';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { MembershipModule } from './membership/membership.module';
import { MoviesModule } from './movies/movies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ProfileModule } from './profile/profile.module';
import { PromotionsModule } from './promotions/promotions.module';
import { RescheduleModule } from './reschedule/reschedule.module';
import { SeatsModule } from './seats/seats.module';
import { SnacksModule } from './snacks/snacks.module';
import { TicketsModule } from './tickets/tickets.module';
import { TransferModule } from './transfer/transfer.module';
import { GiftcardsModule } from './giftcards/giftcards.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { CineflashModule } from './cineflash/cineflash.module';
import { AiModule } from './ai/ai.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SurveysModule } from './surveys/surveys.module';
import { PqrsModule } from './pqrs/pqrs.module';

/**
 * Módulo raíz de NestJS.
 *
 * Piensa en un módulo como una “caja” que declara:
 * - qué necesita importar (`imports`)
 * - qué controladores expone (`controllers`)
 * - qué servicios ofrece (`providers`)
 *
 * `AppModule` no recibe parámetros de constructor aquí: solo configura
 * el grafo de dependencias de toda la aplicación.
 *
 * @remarks
 * Orden típico de arranque:
 * 1. Validar variables de entorno (`ConfigModule`)
 * 2. Conectar PostgreSQL (`TypeOrmModule`)
 * 3. Cargar módulos de negocio (`HealthModule`, luego películas, auth, …)
 */
@Module({
  imports: [
    /**
     * Configuración global de entorno.
     * `isGlobal: true` → no hace falta reimportar ConfigModule en cada feature.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      /** Busca `.env` en el backend y, si existe, uno nivel arriba (raíz del monorepo). */
      envFilePath: ['.env', '../.env'],
      /** Namespace `database.*` definido en `database.config.ts`. */
      load: [databaseConfig],
      /** Si faltan vars críticas, la app NO arranca (falla rápido). */
      validate: validateEnv,
    }),

    /**
     * Conexión asíncrona a PostgreSQL.
     * `forRootAsync` permite inyectar `ConfigService` antes de crear el DataSource.
     */
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      /**
       * Fábrica de opciones de TypeORM.
       *
       * @param configService - Servicio de Nest para leer env ya validado.
       * @returns Opciones de conexión Postgres usadas por TypeORM.
       */
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        /**
         * Carga automáticamente entidades registradas con `@Entity()`
         * en módulos feature (`LocationsModule`, etc.).
         */
        autoLoadEntities: true,
        /**
         * `synchronize: true` crea/altera tablas según entidades.
         * SOLO desarrollo. En producción se usan migraciones.
         */
        synchronize: configService.get<boolean>('database.synchronize'),
      }),
    }),

    /**
     * Rate limiting global (HU-006: fuerza bruta en registro).
     * Defaults suaves; `POST /auth/register` endurece con `@Throttle`.
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    /** Cron de recordatorios de función (HU-015). */
    ScheduleModule.forRoot(),

    /** Health check (HU-001). */
    HealthModule,
    /** Catálogo geográfico País → Departamento → Ciudad (HU-002). */
    LocationsModule,
    /** Avisos de estreno + motor de correo (HU-005 / HU-015). */
    NotificationsModule,
    /** Cartelera, detalle y próximos estrenos (HU-003 / HU-004 / HU-005). */
    MoviesModule,
    /** Membresía digital + billetera + consulta/QR (HU-006 / HU-008). */
    MembershipModule,
    /** Registro y activación de cuenta (HU-006) + sesión JWT (HU-007). */
    AuthModule,
    /** Perfil y preferencias del usuario autenticado (HU-008). */
    ProfileModule,
    /** Mapa de sillas + locks temporales (HU-010). */
    SeatsModule,
    /** Catálogo de confitería (HU-012). */
    SnacksModule,
    /** Carrito de compras entradas + snacks (HU-011 / HU-012). */
    CartModule,
    /** Entradas digitales + factura (HU-014); también usado por Payments. */
    TicketsModule,
    /** Pagos seguros + órdenes (HU-013). */
    PaymentsModule,
    /** Cambio de función / reprogramación (HU-016). */
    RescheduleModule,
    /** Transferencia de entradas a otro usuario (HU-017). */
    TransferModule,
    /** Bonos de regalo digitales (HU-018). */
    GiftcardsModule,
    /** Fidelización y puntos (HU-023). */
    LoyaltyModule,
    /** Promociones y cupones (HU-026). */
    PromotionsModule,
    /** Cine Flash automático (HU-019). */
    CineflashModule,
    /** Chatbot IA de recomendaciones (HU-021). */
    AiModule,
    /** Motor de recomendaciones personalizadas (HU-022). */
    RecommendationsModule,
    /** Dashboard gerencial de KPIs (HU-025). */
    AnalyticsModule,
    /** Encuestas de satisfacción post-visita (HU-027). */
    SurveysModule,
    /** PQRS integrado (HU-028). */
    PqrsModule,
    /** Panel administrativo / RBAC (HU-020) + CRUD promos. */
    AdminModule,
  ],
  providers: [
    /**
     * Aplica el rate limit a todas las rutas HTTP.
     * Endpoints críticos pueden bajar el techo con `@Throttle`.
     */
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
