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
   * URL pública base para enlaces de activación / tickets (HU-006 / HU-015).
   * @default http://localhost:3000
   */
  @IsOptional()
  @IsString()
  APP_PUBLIC_URL: string = 'http://localhost:3000';

  /**
   * Si `true`, el adaptador de correo falla a propósito (probar RN-063).
   * @default false
   */
  @IsOptional()
  @IsString()
  EMAIL_FORCE_FAIL?: string;

  /**
   * Token CAPTCHA aceptado en desarrollo (sin proveedor externo).
   * @default dev-ok
   */
  @IsOptional()
  @IsString()
  CAPTCHA_DEV_TOKEN: string = 'dev-ok';

  /**
   * Secreto de firma del Access JWT (HU-007).
   * En producción DEBE ser un valor fuerte y único.
   * @default dev-jwt-secret-change-me
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string = 'dev-jwt-secret-change-me';

  /**
   * Clave AES-256 (64 hex = 32 bytes) para cifrar payload de pasarela (HU-013).
   * @default 64 hex de desarrollo (NO usar en producción)
   */
  @IsOptional()
  @IsString()
  PAYMENT_AES_KEY: string =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  /**
   * Secreto HMAC para validar webhooks de pago (HU-013 / RN-053).
   * @default dev-payment-webhook-secret
   */
  @IsOptional()
  @IsString()
  PAYMENT_WEBHOOK_SECRET: string = 'dev-payment-webhook-secret';

  /**
   * API key de OpenAI para el chatbot (HU-021). Opcional:
   * sin ella el adaptador usa stub local determinista.
   */
  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  /**
   * Días por defecto para excluir películas ya vistas (HU-022 / RN-098).
   * El usuario puede sobrescribirlo en preferencias.
   * @default 30
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  RECOMMENDATIONS_RECENTLY_VIEWED_DAYS: number = 30;
}
