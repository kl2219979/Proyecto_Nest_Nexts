import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Contrato de respuesta del health check.
 *
 * @property status - `"ok"` si la DB responde; `"degraded"` si la API vive pero la DB no.
 * @property timestamp - Momento de la verificación en ISO-8601.
 * @property uptime - Segundos desde que arrancó el proceso Node.
 * @property database - `"up"` | `"down"` según el resultado de `SELECT 1`.
 */
export type HealthStatus = {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  database: 'up' | 'down';
};

/**
 * Lógica de negocio del health check.
 *
 * `@Injectable()` marca la clase para que Nest pueda inyectarla
 * en controladores u otros servicios.
 */
@Injectable()
export class HealthService {
  /**
   * @param dataSource - Conexión TypeORM a PostgreSQL.
   *                     `@InjectDataSource()` pide la conexión registrada
   *                     en `TypeOrmModule.forRootAsync(...)`.
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Comprueba si la base de datos acepta consultas simples.
   *
   * @returns {Promise<HealthStatus>} Objeto con estado agregado de API + DB.
   *                                  Nunca lanza error por DB caída: captura
   *                                  la excepción y marca `database: "down"`.
   */
  async check(): Promise<HealthStatus> {
    let database: 'up' | 'down' = 'down';

    try {
      /**
       * `SELECT 1` es el “ping” clásico a Postgres:
       * no lee tablas de negocio, solo verifica conectividad.
       */
      await this.dataSource.query('SELECT 1');
      database = 'up';
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
    };
  }
}
