import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { SendEmailDto } from './dto/send-email.dto';
import { SubscribeUpcomingDto } from './dto/subscribe-upcoming.dto';
import { UpdateEmailPreferencesDto } from './dto/update-email-preferences.dto';
import {
  EmailNotificationView,
  EmailPreferencesView,
  EmailService,
} from './email.service';
import {
  NotificationsService,
  UpcomingSubscriptionResult,
} from './notifications.service';

/**
 * Notificaciones: estrenos (HU-005) + correo transaccional (HU-015).
 *
 * Endpoints HU-015:
 * - `POST/GET /notifications/email`
 * - `GET/PUT/POST /notifications/preferences`
 */
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  /**
   * @param notificationsService - Avisos de estreno.
   * @param emailService - Motor de correo + preferencias.
   */
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Activa “Notificarme cuando esté disponible” (HU-005).
   *
   * @param dto - Usuario, email, película y ciudad.
   * @returns Solicitud registrada.
   */
  @Post('upcoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suscribirse al aviso de estreno de una película',
    description:
      'RN-019 evita duplicados. Al pasar a cartelera se envía correo (HU-015 / RN-020).',
  })
  @ApiOkResponse({ description: 'Solicitud de aviso registrada' })
  @ApiConflictResponse({ description: 'Duplicado (RN-019)' })
  subscribeUpcoming(
    @Body() dto: SubscribeUpcomingDto,
  ): Promise<UpcomingSubscriptionResult> {
    return this.notificationsService.subscribeUpcoming(dto);
  }

  /**
   * Historial de correos del usuario (RN-061).
   *
   * @param user - JWT.
   * @returns Últimos envíos.
   */
  @Get('email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Historial de notificaciones por correo',
    description: 'RN-061: consulta de envíos del usuario autenticado.',
  })
  @ApiOkResponse({ description: 'Lista de notificaciones' })
  listEmailHistory(
    @CurrentUser() user: AuthUser,
  ): Promise<EmailNotificationView[]> {
    return this.emailService.listForUser(user.userId);
  }

  /**
   * Encola un correo para el usuario autenticado (demo / reenvío).
   *
   * @param user - JWT.
   * @param dto - Plantilla y payload.
   * @returns Registro del historial.
   */
  @Post('email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Encolar y enviar un correo (JWT)',
    description:
      'Útil para demos. Los flujos de negocio (pago, registro…) disparan el motor automáticamente.',
  })
  @ApiOkResponse({ description: 'Notificación registrada y despachada' })
  async sendEmail(
    @CurrentUser() user: AuthUser,
    @Body() dto: SendEmailDto,
  ): Promise<EmailNotificationView> {
    const row = await this.emailService.enqueueAndSend({
      userId: user.userId,
      toEmail: dto.toEmail ?? user.email,
      template: dto.template,
      payload: dto.payload,
      relatedEntityType: dto.relatedEntityType,
      relatedEntityId: dto.relatedEntityId,
    });
    return this.emailService.toView(row);
  }

  /**
   * Lee preferencias de correo (RN-062).
   *
   * @param user - JWT.
   * @returns Flags actuales.
   */
  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar preferencias de notificación' })
  @ApiOkResponse({ description: 'Preferencias actuales' })
  getPreferences(
    @CurrentUser() user: AuthUser,
  ): Promise<EmailPreferencesView> {
    return this.emailService.getPreferences(user.userId);
  }

  /**
   * Actualiza preferencias (PUT — backlog HU-015).
   *
   * @param user - JWT.
   * @param dto - Campos a cambiar.
   * @returns Preferencias resultantes.
   */
  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar preferencias de notificación',
    description:
      'RN-062: marketing/upcoming opt-out; transaccionales obligatorios siempre se envían.',
  })
  @ApiOkResponse({ description: 'Preferencias actualizadas' })
  updatePreferencesPut(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEmailPreferencesDto,
  ): Promise<EmailPreferencesView> {
    return this.emailService.updatePreferences(user.userId, dto);
  }

  /**
   * Actualiza preferencias (POST — alias del backlog `…preferencesPOST`).
   *
   * @param user - JWT.
   * @param dto - Campos a cambiar.
   * @returns Preferencias resultantes.
   */
  @Post('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar preferencias (alias POST)',
    description: 'Misma semántica que PUT /notifications/preferences.',
  })
  @ApiOkResponse({ description: 'Preferencias actualizadas' })
  updatePreferencesPost(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEmailPreferencesDto,
  ): Promise<EmailPreferencesView> {
    return this.emailService.updatePreferences(user.userId, dto);
  }
}
