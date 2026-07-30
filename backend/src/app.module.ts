import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/validate-env';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';

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

    /** Health check (HU-001). */
    HealthModule,
    /** Catálogo geográfico País → Departamento → Ciudad (HU-002). */
    LocationsModule,
  ],
})
export class AppModule {}
