import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CineflashService } from './cineflash.service';

/**
 * Job automático de Cine Flash (HU-019).
 *
 * Cada 5 minutos evalúa ocupación de funciones próximas y activa
 * o apaga promociones inteligentes.
 *
 * @remarks
 * **Patrón:** Scheduled Job (cron).
 * Problema que resuelve: correr el motor sin acoplar Schedule al controller HTTP.
 */
@Injectable()
export class CineflashJob {
  private readonly logger = new Logger(CineflashJob.name);

  /**
   * @param cineflashService - Lógica de negocio.
   */
  constructor(private readonly cineflashService: CineflashService) {}

  /**
   * Cron cada 5 minutos.
   *
   * @returns Resumen de la pasada.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCineFlash(): Promise<void> {
    const result = await this.cineflashService.process();
    if (result.activated + result.deactivated > 0) {
      this.logger.log(
        `Cine Flash: activated=${result.activated} deactivated=${result.deactivated} emails=${result.emailsQueued}`,
      );
    }
  }
}
