import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { EmailGatewayService } from './email-gateway.service';
import { EmailNotification } from './entities/email-notification.entity';
import {
  EmailCategory,
  EmailNotificationStatus,
  EmailTemplate,
} from './enums/email-notification.enums';
import {
  EmailTemplates,
  TEMPLATE_CATEGORY,
} from './templates/email-templates';
import { UpdateEmailPreferencesDto } from './dto/update-email-preferences.dto';

/** Máximo de intentos de envío (RN-063). */
const MAX_SEND_ATTEMPTS = 3;

/**
 * Entrada tipada para encolar un correo.
 */
export type EnqueueEmailInput = {
  userId?: string | null;
  toEmail: string;
  template: EmailTemplate;
  payload?: Record<string, unknown>;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  /** Si true, no reenvía si ya hay SENT/PENDING/SKIPPED para misma plantilla+entidad. */
  idempotent?: boolean;
};

/**
 * Vista pública de un registro del historial.
 */
export type EmailNotificationView = {
  id: string;
  toEmail: string;
  template: EmailTemplate;
  category: EmailCategory;
  subject: string;
  status: EmailNotificationStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  sentAt: string | null;
  createdAt: string;
};

/**
 * Preferencias serializadas.
 */
export type EmailPreferencesView = {
  emailTransactional: boolean;
  emailMarketing: boolean;
  emailUpcoming: boolean;
};

/**
 * Motor de correo transaccional (HU-015).
 *
 * Responsabilidades (SRP):
 * 1. Encolar + historial (RN-061).
 * 2. Respetar preferencias de marketing/estrenos (RN-062).
 * 3. Reintentar hasta 3 veces ante fallo del adaptador (RN-063).
 * 4. Exponer helpers de dominio que Auth/Payments/Profile invocan.
 *
 * El envío físico lo hace `EmailGatewayService` (Adapter).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * @param emailRepo - Historial / outbox.
   * @param prefsRepo - Preferencias del usuario.
   * @param profileRepo - Nombre para personalizar plantillas.
   * @param gateway - Adaptador de envío.
   * @param config - `APP_PUBLIC_URL`.
   */
  constructor(
    @InjectRepository(EmailNotification)
    private readonly emailRepo: Repository<EmailNotification>,
    @InjectRepository(NotificationPreference)
    private readonly prefsRepo: Repository<NotificationPreference>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    private readonly gateway: EmailGatewayService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Encola y despacha un correo (historial + reintentos).
   *
   * @param input - Destinatario, plantilla y payload.
   * @returns Registro del historial tras el intento.
   */
  async enqueueAndSend(input: EnqueueEmailInput): Promise<EmailNotification> {
    const toEmail = input.toEmail.trim().toLowerCase();
    const category = TEMPLATE_CATEGORY[input.template];

    if (
      input.idempotent &&
      input.relatedEntityType &&
      input.relatedEntityId
    ) {
      const existing = await this.emailRepo.findOne({
        where: {
          template: input.template,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          ...(input.userId ? { userId: input.userId } : {}),
        },
        order: { createdAt: 'DESC' },
      });
      if (
        existing &&
        (existing.status === EmailNotificationStatus.SENT ||
          existing.status === EmailNotificationStatus.PENDING ||
          existing.status === EmailNotificationStatus.SKIPPED)
      ) {
        return existing;
      }
    }

    const prefs = input.userId
      ? await this.prefsRepo.findOne({ where: { userId: input.userId } })
      : null;

    if (category === EmailCategory.MARKETING && prefs && !prefs.emailMarketing) {
      return this.persistSkipped(input, toEmail, category, 'emailMarketing=false');
    }
    if (category === EmailCategory.UPCOMING && prefs && !prefs.emailUpcoming) {
      return this.persistSkipped(input, toEmail, category, 'emailUpcoming=false');
    }

    const recipientName = await this.resolveRecipientName(input.userId);
    const appPublicUrl = this.publicUrl();
    const rendered = EmailTemplates.render(input.template, {
      ...input.payload,
      recipientName,
      appPublicUrl,
    });

    const row = await this.emailRepo.save(
      this.emailRepo.create({
        userId: input.userId ?? null,
        toEmail,
        template: input.template,
        category,
        subject: rendered.subject,
        status: EmailNotificationStatus.PENDING,
        attemptCount: 0,
        maxAttempts: MAX_SEND_ATTEMPTS,
        lastError: null,
        payload: input.payload ?? {},
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        sentAt: null,
      }),
    );

    return this.deliverWithRetries(row, rendered.html, rendered.text);
  }

  /**
   * Historial de correos del usuario autenticado (RN-061).
   *
   * @param userId - UUID del titular.
   * @returns Lista ordenada (más reciente primero).
   */
  async listForUser(userId: string): Promise<EmailNotificationView[]> {
    const rows = await this.emailRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return rows.map((r) => this.toView(r));
  }

  /**
   * Lee preferencias de notificación (HU-015).
   *
   * @param userId - UUID.
   * @returns Flags de preferencia.
   */
  async getPreferences(userId: string): Promise<EmailPreferencesView> {
    const prefs = await this.requirePrefs(userId);
    return {
      emailTransactional: prefs.emailTransactional,
      emailMarketing: prefs.emailMarketing,
      emailUpcoming: prefs.emailUpcoming,
    };
  }

  /**
   * Actualiza preferencias (RN-062: marketing/upcoming).
   *
   * @param userId - UUID.
   * @param dto - Campos opcionales.
   * @returns Preferencias resultantes.
   */
  async updatePreferences(
    userId: string,
    dto: UpdateEmailPreferencesDto,
  ): Promise<EmailPreferencesView> {
    const prefs = await this.requirePrefs(userId);
    if (dto.emailTransactional !== undefined) {
      prefs.emailTransactional = dto.emailTransactional;
    }
    if (dto.emailMarketing !== undefined) {
      prefs.emailMarketing = dto.emailMarketing;
    }
    if (dto.emailUpcoming !== undefined) {
      prefs.emailUpcoming = dto.emailUpcoming;
    }
    await this.prefsRepo.save(prefs);
    return this.getPreferences(userId);
  }

  // —— Helpers de dominio (disparadores automáticos) ————————————————

  /**
   * Correo de activación tras registro (HU-006).
   */
  async sendAccountActivation(
    userId: string,
    email: string,
    token: string,
  ): Promise<EmailNotification> {
    const activationLink = `${this.publicUrl()}/api/v1/auth/activate?token=${token}`;
    return this.enqueueAndSend({
      userId,
      toEmail: email,
      template: EmailTemplate.ACCOUNT_ACTIVATION,
      payload: { activationLink },
      relatedEntityType: 'USER',
      relatedEntityId: userId,
    });
  }

  /**
   * Confirmación de cuenta activada.
   */
  async sendAccountActivated(
    userId: string,
    email: string,
  ): Promise<EmailNotification> {
    return this.enqueueAndSend({
      userId,
      toEmail: email,
      template: EmailTemplate.ACCOUNT_ACTIVATED,
      relatedEntityType: 'USER_ACTIVATED',
      relatedEntityId: userId,
    });
  }

  /**
   * Recuperación de contraseña (HU-007).
   */
  async sendPasswordReset(
    userId: string,
    email: string,
    token: string,
  ): Promise<EmailNotification> {
    const resetLink = `${this.publicUrl()}/api/v1/auth/reset-password?token=${token}`;
    return this.enqueueAndSend({
      userId,
      toEmail: email,
      template: EmailTemplate.PASSWORD_RESET,
      payload: { resetLink },
    });
  }

  /**
   * Contraseña cambiada con éxito.
   */
  async sendPasswordChanged(
    userId: string,
    email: string,
  ): Promise<EmailNotification> {
    return this.enqueueAndSend({
      userId,
      toEmail: email,
      template: EmailTemplate.PASSWORD_CHANGED,
    });
  }

  /**
   * Perfil actualizado (sin cambio de email).
   */
  async sendProfileUpdated(
    userId: string,
    email: string,
  ): Promise<EmailNotification> {
    return this.enqueueAndSend({
      userId,
      toEmail: email,
      template: EmailTemplate.PROFILE_UPDATED,
    });
  }

  /**
   * Re-verificación tras cambio de email (RN-034).
   */
  async sendEmailReverification(
    userId: string,
    email: string,
    token: string,
  ): Promise<EmailNotification> {
    const activationLink = `${this.publicUrl()}/api/v1/auth/activate?token=${token}`;
    return this.enqueueAndSend({
      userId,
      toEmail: email,
      template: EmailTemplate.EMAIL_REVERIFICATION,
      payload: { activationLink },
    });
  }

  /**
   * Compra exitosa + enlaces a entradas/factura (RN-064).
   */
  async sendPurchaseSuccess(params: {
    userId: string;
    email: string;
    orderId: string;
    invoiceId: string;
    movieTitle: string;
    startsAt: string;
    total: string;
  }): Promise<EmailNotification> {
    const base = this.publicUrl();
    return this.enqueueAndSend({
      userId: params.userId,
      toEmail: params.email,
      template: EmailTemplate.PURCHASE_SUCCESS,
      payload: {
        orderId: params.orderId,
        movieTitle: params.movieTitle,
        startsAt: params.startsAt,
        total: params.total,
        ticketsUrl: `${base}/api/v1/tickets`,
        invoiceUrl: `${base}/api/v1/invoice/${params.invoiceId}`,
        invoicePdfUrl: `${base}/api/v1/invoice/${params.invoiceId}/pdf`,
      },
      relatedEntityType: 'ORDER',
      relatedEntityId: params.orderId,
      idempotent: true,
    });
  }

  /**
   * Cambio de función / reprogramación (HU-016).
   */
  async sendFunctionChanged(params: {
    userId: string;
    email: string;
    orderId: string;
    movieTitle: string;
    oldStartsAt: string;
    newStartsAt: string;
    priceDifference: string;
    creditApplied: string;
    surchargeAmount: string;
  }): Promise<EmailNotification> {
    const base = this.publicUrl();
    return this.enqueueAndSend({
      userId: params.userId,
      toEmail: params.email,
      template: EmailTemplate.FUNCTION_CHANGED,
      payload: {
        orderId: params.orderId,
        movieTitle: params.movieTitle,
        oldStartsAt: params.oldStartsAt,
        newStartsAt: params.newStartsAt,
        priceDifference: params.priceDifference,
        creditApplied: params.creditApplied,
        surchargeAmount: params.surchargeAmount,
        ticketsUrl: `${base}/api/v1/tickets`,
      },
      relatedEntityType: 'ORDER_RESCHEDULE',
      relatedEntityId: params.orderId,
    });
  }

  /**
   * Solicitud de cesión a un usuario ya registrado (HU-017).
   */
  async sendTicketTransferRequest(params: {
    userId: string;
    toEmail: string;
    toName: string;
    fromEmail: string;
    movieTitle: string;
    startsAt: string;
    transferId: string;
    acceptToken: string;
    seatCount: number;
  }): Promise<EmailNotification> {
    const base = this.publicUrl();
    return this.enqueueAndSend({
      userId: params.userId,
      toEmail: params.toEmail,
      template: EmailTemplate.TICKET_TRANSFER,
      payload: {
        variant: 'request',
        recipientName: params.toName,
        fromEmail: params.fromEmail,
        movieTitle: params.movieTitle,
        startsAt: params.startsAt,
        seatCount: params.seatCount,
        transferId: params.transferId,
        acceptUrl: `${base}/api/docs#/Tickets%20%2F%20Transfer/TicketsTransferController_accept`,
        acceptToken: params.acceptToken,
        ticketsUrl: `${base}/api/v1/tickets`,
      },
      relatedEntityType: 'TICKET_TRANSFER_REQUEST',
      relatedEntityId: params.transferId,
    });
  }

  /**
   * Invitación a registrarse para recibir entradas (HU-017).
   */
  async sendTicketTransferInvite(params: {
    toEmail: string;
    toName: string;
    fromEmail: string;
    movieTitle: string;
    startsAt: string;
    transferId: string;
    acceptToken: string;
    seatCount: number;
  }): Promise<EmailNotification> {
    const base = this.publicUrl();
    return this.enqueueAndSend({
      userId: null,
      toEmail: params.toEmail,
      template: EmailTemplate.TICKET_TRANSFER,
      payload: {
        variant: 'invite',
        recipientName: params.toName,
        fromEmail: params.fromEmail,
        movieTitle: params.movieTitle,
        startsAt: params.startsAt,
        seatCount: params.seatCount,
        transferId: params.transferId,
        registerUrl: `${base}/api/docs`,
        acceptUrl: `${base}/api/v1/tickets/transfer/accept`,
        acceptToken: params.acceptToken,
      },
      relatedEntityType: 'TICKET_TRANSFER_INVITE',
      relatedEntityId: params.transferId,
    });
  }

  /**
   * Acuse al emisor de que la cesión quedó PENDING (HU-017).
   */
  async sendTicketTransferNoticeToSender(params: {
    userId: string;
    email: string;
    toEmail: string;
    toName: string;
    movieTitle: string;
    startsAt: string;
    transferId: string;
    seatCount: number;
    invited: boolean;
  }): Promise<EmailNotification> {
    return this.enqueueAndSend({
      userId: params.userId,
      toEmail: params.email,
      template: EmailTemplate.TICKET_TRANSFER,
      payload: {
        variant: 'sender_notice',
        toEmail: params.toEmail,
        toName: params.toName,
        movieTitle: params.movieTitle,
        startsAt: params.startsAt,
        seatCount: params.seatCount,
        transferId: params.transferId,
        invited: params.invited,
      },
      relatedEntityType: 'TICKET_TRANSFER_SENDER',
      relatedEntityId: params.transferId,
    });
  }

  /**
   * Confirmación tras aceptar la cesión (emisor o destinatario) (HU-017).
   */
  async sendTicketTransferAccepted(params: {
    userId: string;
    toEmail: string;
    toName: string;
    movieTitle: string;
    startsAt: string;
    transferId: string;
    seatCount: number;
    role: 'sender' | 'recipient';
  }): Promise<EmailNotification> {
    const base = this.publicUrl();
    return this.enqueueAndSend({
      userId: params.userId,
      toEmail: params.toEmail,
      template: EmailTemplate.TICKET_TRANSFER,
      payload: {
        variant:
          params.role === 'recipient'
            ? 'accepted_recipient'
            : 'accepted_sender',
        recipientName: params.role === 'recipient' ? params.toName : undefined,
        toName: params.toName,
        movieTitle: params.movieTitle,
        startsAt: params.startsAt,
        seatCount: params.seatCount,
        transferId: params.transferId,
        ticketsUrl: `${base}/api/v1/tickets`,
      },
      relatedEntityType: 'TICKET_TRANSFER_ACCEPTED',
      relatedEntityId: params.transferId,
    });
  }

  /**
   * Pago rechazado.
   */
  async sendPaymentRejected(
    userId: string,
    email: string,
    orderId: string,
  ): Promise<EmailNotification> {
    return this.enqueueAndSend({
      userId,
      toEmail: email,
      template: EmailTemplate.PAYMENT_REJECTED,
      payload: { orderId },
      relatedEntityType: 'ORDER_REJECTED',
      relatedEntityId: orderId,
      idempotent: true,
    });
  }

  /**
   * Aviso de estreno (marketing de cartelera / upcoming prefs).
   */
  async sendUpcomingRelease(params: {
    userId: string;
    email: string;
    movieId: string;
    movieTitle: string;
    cityId: string;
  }): Promise<EmailNotification> {
    return this.enqueueAndSend({
      userId: params.userId,
      toEmail: params.email,
      template: EmailTemplate.UPCOMING_RELEASE,
      payload: {
        movieTitle: params.movieTitle,
        movieUrl: `${this.publicUrl()}/api/v1/movies/${params.movieId}?cityId=${params.cityId}`,
        cityId: params.cityId,
      },
      relatedEntityType: 'UPCOMING_MOVIE',
      relatedEntityId: params.movieId,
    });
  }

  /**
   * Recordatorio de función (24 h o 2 h).
   */
  async sendShowtimeReminder(params: {
    userId: string;
    email: string;
    orderId: string;
    hoursBefore: 24 | 2;
    movieTitle: string;
    startsAt: string;
    cinemaName: string;
    roomName: string;
  }): Promise<EmailNotification> {
    const template =
      params.hoursBefore === 24
        ? EmailTemplate.SHOWTIME_REMINDER_24H
        : EmailTemplate.SHOWTIME_REMINDER_2H;
    const relatedEntityType =
      params.hoursBefore === 24 ? 'ORDER_REMINDER_24H' : 'ORDER_REMINDER_2H';
    return this.enqueueAndSend({
      userId: params.userId,
      toEmail: params.email,
      template,
      payload: {
        movieTitle: params.movieTitle,
        startsAt: params.startsAt,
        cinemaName: params.cinemaName,
        roomName: params.roomName,
        ticketsUrl: `${this.publicUrl()}/api/v1/tickets`,
      },
      relatedEntityType,
      relatedEntityId: params.orderId,
      idempotent: true,
    });
  }

  /**
   * ¿Ya se envió (o encoló) un recordatorio de este tipo para la orden?
   */
  async hasReminder(
    orderId: string,
    hoursBefore: 24 | 2,
  ): Promise<boolean> {
    const relatedEntityType =
      hoursBefore === 24 ? 'ORDER_REMINDER_24H' : 'ORDER_REMINDER_2H';
    const found = await this.emailRepo.findOne({
      where: {
        relatedEntityType,
        relatedEntityId: orderId,
      },
    });
    return Boolean(found);
  }

  /**
   * Serializa entidad → vista API.
   */
  toView(row: EmailNotification): EmailNotificationView {
    return {
      id: row.id,
      toEmail: row.toEmail,
      template: row.template,
      category: row.category,
      subject: row.subject,
      status: row.status,
      attemptCount: row.attemptCount,
      maxAttempts: row.maxAttempts,
      lastError: row.lastError,
      relatedEntityType: row.relatedEntityType,
      relatedEntityId: row.relatedEntityId,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Intenta entregar hasta `maxAttempts` veces (RN-063).
   */
  private async deliverWithRetries(
    row: EmailNotification,
    html: string,
    text: string,
  ): Promise<EmailNotification> {
    while (row.attemptCount < row.maxAttempts) {
      row.attemptCount += 1;
      try {
        await this.gateway.send({
          to: row.toEmail,
          subject: row.subject,
          html,
          text,
          notificationId: row.id,
        });
        row.status = EmailNotificationStatus.SENT;
        row.sentAt = new Date();
        row.lastError = null;
        return this.emailRepo.save(row);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        row.lastError = message;
        this.logger.warn(
          `Fallo envío email id=${row.id} attempt=${row.attemptCount}/${row.maxAttempts}: ${message}`,
        );
      }
    }

    row.status = EmailNotificationStatus.FAILED;
    return this.emailRepo.save(row);
  }

  private async persistSkipped(
    input: EnqueueEmailInput,
    toEmail: string,
    category: EmailCategory,
    reason: string,
  ): Promise<EmailNotification> {
    const rendered = EmailTemplates.render(input.template, {
      ...input.payload,
      appPublicUrl: this.publicUrl(),
    });
    return this.emailRepo.save(
      this.emailRepo.create({
        userId: input.userId ?? null,
        toEmail,
        template: input.template,
        category,
        subject: rendered.subject,
        status: EmailNotificationStatus.SKIPPED,
        attemptCount: 0,
        maxAttempts: MAX_SEND_ATTEMPTS,
        lastError: reason,
        payload: input.payload ?? {},
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        sentAt: null,
      }),
    );
  }

  private async requirePrefs(userId: string): Promise<NotificationPreference> {
    const prefs = await this.prefsRepo.findOne({ where: { userId } });
    if (!prefs) {
      throw new NotFoundException(
        `Preferencias de notificación no encontradas para usuario ${userId}`,
      );
    }
    return prefs;
  }

  private async resolveRecipientName(
    userId: string | null | undefined,
  ): Promise<string | undefined> {
    if (!userId) {
      return undefined;
    }
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      return undefined;
    }
    return `${profile.firstName} ${profile.lastName}`.trim();
  }

  private publicUrl(): string {
    return (
      this.config.get<string>('APP_PUBLIC_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }
}
