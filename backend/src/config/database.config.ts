import { registerAs } from '@nestjs/config';

/**
 * Namespace de configuración de base de datos.
 *
 * `registerAs('database', factory)` registra un objeto bajo la clave `database`.
 * Luego se lee así:
 * - `configService.get('database.host')`
 * - `configService.get('database.port')`
 *
 * ¿Por qué no leer `process.env` directo en `AppModule`?
 * Porque centralizar aquí facilita tests, tipado y un solo lugar de defaults.
 *
 * @returns Objeto con credenciales y flags de TypeORM.
 *          Nest lo expone como `database.*` dentro de ConfigService.
 *
 * @example
 * // En TypeOrmModule.forRootAsync:
 * // host: configService.get<string>('database.host')
 */
export default registerAs('database', () => ({
  /** Host Postgres (`db` en Docker, `localhost` en máquina host). */
  host: process.env.DATABASE_HOST,
  /** Puerto Postgres. */
  port: Number(process.env.DATABASE_PORT) || 5432,
  /** Usuario. */
  username: process.env.DATABASE_USER,
  /** Contraseña. */
  password: process.env.DATABASE_PASSWORD,
  /** Nombre de la base. */
  database: process.env.DATABASE_NAME,
  /**
   * Sincronización automática del esquema.
   * Activa si `DATABASE_SYNC=true` o si estamos en `development`.
   */
  synchronize:
    process.env.DATABASE_SYNC === 'true' ||
    process.env.NODE_ENV === 'development',
}));
