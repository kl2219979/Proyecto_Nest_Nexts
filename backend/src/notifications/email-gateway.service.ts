import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Mensaje listo para el proveedor de correo.
 */
export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Identificador interno para traza (email_notifications.id). */
  notificationId?: string;
};

/**
 * Adaptador de plataforma de correo transaccional (HU-015).
 *
 * @remarks
 * **Patrón:** Adapter.
 * Problema que resuelve: aislar el “cómo se envía” (log local vs SendGrid/
 * SES/SMTP) del dominio de notificaciones, para poder cambiar de proveedor
 * sin tocar `EmailService` ni los disparadores de negocio.
 *
 * En desarrollo el adaptador **registra el correo en log** (misma idea que
 * el stub de pasarela HU-013). Si `EMAIL_FORCE_FAIL=true`, lanza error
 * para ejercitar reintentos (RN-063) en pruebas.
 */
@Injectable()
export class EmailGatewayService {
  private readonly logger = new Logger(EmailGatewayService.name);

  /**
   * @param config - Lee `EMAIL_FORCE_FAIL` y modo de envío.
   */
  constructor(private readonly config: ConfigService) {}

  /**
   * Entrega el mensaje al “proveedor” (log en este stub).
   *
   * @param message - Destinatario + contenido renderizado.
   * @returns Identificador de mensaje del proveedor (demo).
   * @throws {Error} Si `EMAIL_FORCE_FAIL` está activo.
   */
  async send(message: OutboundEmail): Promise<{ providerMessageId: string }> {
    if (this.shouldForceFail()) {
      throw new Error('EMAIL_FORCE_FAIL: simulación de fallo de proveedor');
    }

    const providerMessageId = `mail_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    this.logger.log(
      `Email enviado (stub) → to=${message.to} subject="${message.subject}" ` +
        `id=${message.notificationId ?? '-'} provider=${providerMessageId}`,
    );
    this.logger.debug(
      `Email body (text) → ${message.text.slice(0, 400)}${message.text.length > 400 ? '…' : ''}`,
    );

    return { providerMessageId };
  }

  /**
   * Activa fallos artificiales para probar RN-063.
   *
   * @returns `true` si debe fallar el envío.
   */
  private shouldForceFail(): boolean {
    const raw = this.config.get<string>('EMAIL_FORCE_FAIL');
    return raw === 'true' || raw === '1';
  }
}
