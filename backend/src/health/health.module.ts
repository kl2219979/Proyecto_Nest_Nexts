import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Módulo de salud (Health Check) — HU-001.
 *
 * Encapsula todo lo relacionado con “¿la API está viva y la DB responde?”.
 * Otros módulos no necesitan conocer los detalles internos; solo importarían
 * `HealthModule` si quisieran reutilizar su servicio (hoy no es necesario).
 *
 * @remarks
 * Separación Nest (equivalente a Controller → Service del backlog):
 * - Controller: HTTP
 * - Service: lógica / consulta a Postgres
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
