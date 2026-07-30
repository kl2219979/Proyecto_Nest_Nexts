import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

/**
 * Capa HTTP del health check.
 *
 * Un Controller en Nest:
 * - recibe la petición HTTP
 * - delega la lógica al Service
 * - no debería hablar con la base de datos directamente
 *
 * Ruta final (con prefijo global): `GET /api/v1/health`
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  /**
   * @param healthService - Servicio inyectado por Nest (Inversion of Control).
   *                        No lo creamos con `new`; el framework lo provee.
   */
  constructor(private readonly healthService: HealthService) {}

  /**
   * Endpoint de disponibilidad del sistema.
   *
   * @returns {Promise<HealthStatus>} Estado de la API y de PostgreSQL.
   *                                  Responde HTTP 200 aunque la DB esté caída;
   *                                  en ese caso `status` será `"degraded"`.
   *
   * @example
   * // Respuesta típica cuando todo va bien:
   * // {
   * //   "status": "ok",
   * //   "timestamp": "2026-07-30T21:00:00.000Z",
   * //   "uptime": 12.34,
   * //   "database": "up"
   * // }
   */
  @Get()
  @ApiOperation({ summary: 'Verifica el estado de la API y PostgreSQL' })
  @ApiOkResponse({ description: 'Servicio disponible' })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
