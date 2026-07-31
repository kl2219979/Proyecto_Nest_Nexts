import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecommendationsService } from './recommendations.service';

/**
 * Job diario del motor de recomendaciones (HU-022 / RN-096).
 *
 * Regenera los snapshots de feed existentes una vez al día.
 *
 * @remarks
 * **Patrón:** Scheduled Job (cron).
 * Problema que resuelve: actualizar recomendaciones diariamente sin
 * acoplar `ScheduleModule` al controller HTTP.
 */
@Injectable()
export class RecommendationsJob {
  private readonly logger = new Logger(RecommendationsJob.name);

  /**
   * @param recommendationsService - Motor de scoring + persistencia.
   */
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Cron diario a la 01:00 (hora del servidor).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyRefresh(): Promise<void> {
    const refreshed = await this.recommendationsService.refreshAllFeeds();
    if (refreshed > 0) {
      this.logger.log(
        `Recommendations refresh: feeds=${refreshed} (RN-096)`,
      );
    }
  }
}
