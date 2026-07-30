import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Ambientes soportados por la plataforma (HU-001: Dev / QA / Prod).
 *
 * Usar un enum evita typos como `NODE_ENV=prodution`.
 */
export enum NodeEnv {
  Development = 'development',
  Qa = 'qa',
  Production = 'production',
  Test = 'test',
}

/**
 * Esquema tipado de las variables de entorno obligatorias/opcionales.
 *
 * Esta clase NO se instancia a mano en el día a día.
 * `validateEnv()` la usa con `class-validator` para fallar el arranque
 * si falta algo crítico (por ejemplo `DATABASE_HOST`).
 *
 * @remarks
 * Los decoradores (`@IsString`, `@IsInt`, …) son reglas de validación,
 * no tipos TypeScript. Ambos trabajan juntos: TS en compile-time,
 * class-validator en runtime.
 */
export class EnvironmentVariables {
  /**
   * Ambiente de ejecución.
   * @default NodeEnv.Development
   */
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  /**
   * Puerto HTTP donde Nest escucha.
   * @default 3000
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  /**
   * Host de PostgreSQL.
   * - En Docker Compose: `"db"` (nombre del servicio).
   * - En local sin Docker para la API: `"localhost"`.
   */
  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  /**
   * Puerto de PostgreSQL.
   * @default 5432
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT: number = 5432;

  /** Usuario de la base de datos. */
  @IsString()
  @IsNotEmpty()
  DATABASE_USER!: string;

  /** Contraseña de la base de datos. */
  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD!: string;

  /** Nombre de la base de datos (ej. `multicine_db`). */
  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  /**
   * Si TypeORM debe sincronizar el esquema automáticamente.
   * @default true (desarrollo)
   *
   * @param value - Valor crudo del `.env` (`"true"` / `"false"` / vacío).
   * @returns boolean normalizado para TypeORM.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    return value === true || value === 'true';
  })
  @IsBoolean()
  DATABASE_SYNC: boolean = true;

  /**
   * URL pública base para enlaces de activación (correo HU-006).
   * @default http://localhost:3000
   */
  @IsOptional()
  @IsString()
  APP_PUBLIC_URL: string = 'http://localhost:3000';

  /**
   * Token CAPTCHA aceptado en desarrollo (sin proveedor externo).
   * @default dev-ok
   */
  @IsOptional()
  @IsString()
  CAPTCHA_DEV_TOKEN: string = 'dev-ok';
}
