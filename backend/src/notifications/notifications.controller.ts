import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SubscribeUpcomingDto } from './dto/subscribe-upcoming.dto';
import {
  NotificationsService,
  UpcomingSubscriptionResult,
} from './notifications.service';

/**
 * Endpoints de notificaciones de estreno (HU-005).
 *
 * Ruta del backlog: `POST /notifications/upcoming`.
 * Auth JWT llega en HU-007; hoy el body trae `userId` + `email`.
 */
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  /**
   * @param notificationsService - Alta y disparo de avisos de estreno.
   */
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Activa “Notificarme cuando esté disponible”.
   *
   * @param dto - Usuario, email, película y ciudad.
   * @returns {Promise<UpcomingSubscriptionResult>} Solicitud registrada.
   */
  @Post('upcoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suscribirse al aviso de estreno de una película',
    description:
      'RN-019 evita duplicados (userId + movieId). El envío de correo es HU-015; al pasar a cartelera se marca SENT (RN-020).',
  })
  @ApiOkResponse({ description: 'Solicitud de aviso registrada' })
  @ApiConflictResponse({ description: 'Duplicado (RN-019)' })
  subscribeUpcoming(
    @Body() dto: SubscribeUpcomingDto,
  ): Promise<UpcomingSubscriptionResult> {
    return this.notificationsService.subscribeUpcoming(dto);
  }
}
