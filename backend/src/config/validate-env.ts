import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from './env.validation';

/**
 * Valida el objeto de configuración (normalmente `process.env`)
 * contra la clase `EnvironmentVariables`.
 *
 * Nest llama esta función al iniciar `ConfigModule.forRoot({ validate })`.
 * Si lanza error, la aplicación no arranca: mejor fallar al inicio
 * que descubrir en producción que faltaba la contraseña de la DB.
 *
 * @param config - Mapa clave/valor de variables de entorno (strings en su mayoría).
 * @returns {EnvironmentVariables} Instancia tipada y validada lista para ConfigService.
 * @throws {Error} Si alguna regla de `class-validator` no se cumple.
 *
 * @example
 * validateEnv({
 *   DATABASE_HOST: 'db',
 *   DATABASE_USER: 'multicine',
 *   DATABASE_PASSWORD: 'secret',
 *   DATABASE_NAME: 'multicine_db',
 * });
 */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  /**
   * Convierte el objeto plano en una instancia de la clase,
   * aplicando `@Type()` / `@Transform()` (ej. string → number).
   */
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  /** Ejecuta todas las reglas `@Is*` de forma síncrona. */
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; ')}`,
    );
  }

  return validated;
}
