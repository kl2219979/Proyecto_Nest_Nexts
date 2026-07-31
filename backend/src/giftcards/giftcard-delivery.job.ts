import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GiftcardsService } from './giftcards.service';

/**
 * Job de entrega programada de bonos (HU-018).
 *
 * Cada 5 minutos reintenta envíos pendientes (inmediato fallido o
 * `scheduledSendAt` ya vencido).
 *
 * @remarks
 * **Patrón:** Scheduled Job (cron).
 * Problema que resuelve: enviar correos de giftcard sin bloquear el
 * webhook de pago ni acoplar Nest Schedule al controller.
 */
@Injectable()
export class GiftcardDeliveryJob {
  private readonly logger = new Logger(GiftcardDeliveryJob.name);

  /**
   * @param giftcardsService - Lógica de entrega.
   */
  constructor(private readonly giftcardsService: GiftcardsService) {}

  /**
   * Cron cada 5 minutos.
   *
   * @returns Cantidad de correos enviados en esta pasada.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledDelivery(): Promise<number> {
    const sent = await this.giftcardsService.deliverScheduledDue();
    if (sent > 0) {
      this.logger.log(`Giftcards entregados por correo: ${sent}`);
    }
    return sent;
  }
}
