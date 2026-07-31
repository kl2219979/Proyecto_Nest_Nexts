import {
  EmailCategory,
  EmailTemplate,
} from '../enums/email-notification.enums';

/**
 * Correo ya renderizado listo para el adaptador de envío.
 */
export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Variables mínimas comunes a todas las plantillas.
 */
export type EmailTemplateContext = {
  recipientName?: string;
  appPublicUrl: string;
  /** Resto de campos por plantilla (links, títulos, etc.). */
  [key: string]: unknown;
};

/**
 * Mapa plantilla → categoría (RN-062).
 */
export const TEMPLATE_CATEGORY: Record<EmailTemplate, EmailCategory> = {
  [EmailTemplate.ACCOUNT_ACTIVATION]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.ACCOUNT_ACTIVATED]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.PASSWORD_RESET]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.PASSWORD_CHANGED]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.PROFILE_UPDATED]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.EMAIL_REVERIFICATION]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.PURCHASE_SUCCESS]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.PAYMENT_REJECTED]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.SHOWTIME_REMINDER_24H]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.SHOWTIME_REMINDER_2H]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.UPCOMING_RELEASE]: EmailCategory.UPCOMING,
  [EmailTemplate.FUNCTION_CHANGED]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.TICKET_TRANSFER]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.CANCELLATION]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.REFUND]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.CINE_FLASH]: EmailCategory.MARKETING,
  [EmailTemplate.PROMOTION]: EmailCategory.MARKETING,
  [EmailTemplate.GIFTCARD]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.MEMBERSHIP_BENEFITS]: EmailCategory.MARKETING,
};

/**
 * Asuntos por plantilla (branding Multicine).
 */
const SUBJECTS: Record<EmailTemplate, string> = {
  [EmailTemplate.ACCOUNT_ACTIVATION]: 'Activa tu cuenta Multicine',
  [EmailTemplate.ACCOUNT_ACTIVATED]: 'Tu cuenta Multicine está lista',
  [EmailTemplate.PASSWORD_RESET]: 'Restablece tu contraseña Multicine',
  [EmailTemplate.PASSWORD_CHANGED]: 'Contraseña actualizada — Multicine',
  [EmailTemplate.PROFILE_UPDATED]: 'Perfil actualizado — Multicine',
  [EmailTemplate.EMAIL_REVERIFICATION]: 'Confirma tu nuevo correo — Multicine',
  [EmailTemplate.PURCHASE_SUCCESS]: '¡Compra confirmada! Tus entradas Multicine',
  [EmailTemplate.PAYMENT_REJECTED]: 'Pago no autorizado — Multicine',
  [EmailTemplate.SHOWTIME_REMINDER_24H]: 'Recordatorio: tu función es mañana',
  [EmailTemplate.SHOWTIME_REMINDER_2H]: 'Recordatorio: tu función es en 2 horas',
  [EmailTemplate.UPCOMING_RELEASE]: '¡Ya en cartelera! — Multicine',
  [EmailTemplate.FUNCTION_CHANGED]: 'Cambio de función — Multicine',
  [EmailTemplate.TICKET_TRANSFER]: 'Transferencia de entradas — Multicine',
  [EmailTemplate.CANCELLATION]: 'Cancelación de compra — Multicine',
  [EmailTemplate.REFUND]: 'Reembolso procesado — Multicine',
  [EmailTemplate.CINE_FLASH]: 'Cine Flash: descuento por tiempo limitado',
  [EmailTemplate.PROMOTION]: 'Nueva promoción Multicine',
  [EmailTemplate.GIFTCARD]: 'Tu bono de regalo Multicine',
  [EmailTemplate.MEMBERSHIP_BENEFITS]: 'Beneficios de tu membresía Multicine',
};

/**
 * Constructor de plantillas HTML corporativas (HU-015).
 *
 * Sin motor externo (Handlebars/MJML): HTML inline simple y educativo.
 * El branding Multicine va en el encabezado + colores corporativos.
 */
export class EmailTemplates {
  /**
   * Renderiza asunto + HTML + texto plano para una plantilla.
   *
   * @param template - Identificador de plantilla.
   * @param ctx - Variables (links, nombres, montos…).
   * @returns Correo listo para enviar.
   */
  static render(
    template: EmailTemplate,
    ctx: EmailTemplateContext,
  ): RenderedEmail {
    const name = (ctx.recipientName as string | undefined)?.trim() || 'cineasta';
    const body = this.bodyFor(template, name, ctx);
    const subject = SUBJECTS[template];
    const html = this.wrapHtml(subject, body);
    const text = this.stripHtml(body);
    return { subject, html, text };
  }

  /**
   * Envuelve el cuerpo en layout HTML con branding.
   *
   * @param title - Título visible.
   * @param bodyHtml - Contenido interno.
   * @returns Documento HTML completo.
   */
  private static wrapHtml(title: string, bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><title>${this.escape(title)}</title></head>
<body style="margin:0;padding:0;background:#0b0b0f;font-family:Segoe UI,Arial,sans-serif;color:#f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0f;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#16161d;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#e50914;padding:20px 28px;">
          <div style="font-size:22px;font-weight:700;letter-spacing:0.04em;">MULTICINE</div>
          <div style="font-size:12px;opacity:0.9;margin-top:4px;">Tu cine multipantalla digital</div>
        </td></tr>
        <tr><td style="padding:28px;font-size:15px;line-height:1.55;color:#e8e8ed;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:11px;color:#8a8a96;border-top:1px solid #2a2a35;">
          Este mensaje es automático. No respondas a este correo.<br/>
          © Multicine — Plataforma Web
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /**
   * Cuerpo HTML por plantilla.
   */
  private static bodyFor(
    template: EmailTemplate,
    name: string,
    ctx: EmailTemplateContext,
  ): string {
    const link = (url: string, label: string) =>
      `<p style="margin:20px 0;"><a href="${this.escape(url)}" style="display:inline-block;background:#e50914;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">${this.escape(label)}</a></p>`;

    switch (template) {
      case EmailTemplate.ACCOUNT_ACTIVATION:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Gracias por registrarte en Multicine. Activa tu cuenta para empezar a comprar entradas.</p>
${link(String(ctx.activationLink ?? '#'), 'Activar mi cuenta')}
<p style="font-size:12px;color:#8a8a96;">El enlace vence en 24 horas.</p>`;

      case EmailTemplate.ACCOUNT_ACTIVATED:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Tu cuenta ya está activa. ¡Bienvenido/a a Multicine!</p>
${link(`${ctx.appPublicUrl}/api/docs`, 'Explorar la API')}`;

      case EmailTemplate.PASSWORD_RESET:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Recibimos una solicitud para restablecer tu contraseña.</p>
${link(String(ctx.resetLink ?? '#'), 'Restablecer contraseña')}
<p style="font-size:12px;color:#8a8a96;">Si no fuiste tú, ignora este correo. El enlace vence en 1 hora.</p>`;

      case EmailTemplate.PASSWORD_CHANGED:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Tu contraseña se actualizó correctamente. Si no reconoces este cambio, contacta soporte de inmediato.</p>`;

      case EmailTemplate.PROFILE_UPDATED:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Actualizamos los datos de tu perfil Multicine.</p>`;

      case EmailTemplate.EMAIL_REVERIFICATION:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Confirmaste un cambio de correo. Verifica esta dirección para reactivar tu cuenta.</p>
${link(String(ctx.activationLink ?? '#'), 'Confirmar nuevo correo')}`;

      case EmailTemplate.PURCHASE_SUCCESS: {
        const movie = String(ctx.movieTitle ?? 'tu película');
        const starts = String(ctx.startsAt ?? '');
        const total = String(ctx.total ?? '');
        const ticketsUrl = String(ctx.ticketsUrl ?? '#');
        const invoiceUrl = String(ctx.invoiceUrl ?? '#');
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Tu compra fue confirmada.</p>
<ul>
  <li><strong>Película:</strong> ${this.escape(movie)}</li>
  <li><strong>Función:</strong> ${this.escape(starts)}</li>
  <li><strong>Total:</strong> ${this.escape(total)}</li>
  <li><strong>Orden:</strong> ${this.escape(String(ctx.orderId ?? ''))}</li>
</ul>
${link(ticketsUrl, 'Ver mis entradas')}
${link(invoiceUrl, 'Descargar factura')}
<p style="font-size:12px;color:#8a8a96;">Los PDF también están en Mis compras (enlaces seguros con tu sesión JWT).</p>`;
      }

      case EmailTemplate.PAYMENT_REJECTED:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Tu pago no pudo autorizarse. Las sillas reservadas fueron liberadas.</p>
<p>Puedes intentar de nuevo desde el carrito cuando quieras.</p>`;

      case EmailTemplate.SHOWTIME_REMINDER_24H:
      case EmailTemplate.SHOWTIME_REMINDER_2H: {
        const when =
          template === EmailTemplate.SHOWTIME_REMINDER_24H
            ? 'mañana'
            : 'en aproximadamente 2 horas';
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Te recordamos que tu función de <strong>${this.escape(String(ctx.movieTitle ?? 'cine'))}</strong> es ${when}.</p>
<p><strong>Horario:</strong> ${this.escape(String(ctx.startsAt ?? ''))}<br/>
<strong>Complejo:</strong> ${this.escape(String(ctx.cinemaName ?? ''))}<br/>
<strong>Sala:</strong> ${this.escape(String(ctx.roomName ?? ''))}</p>
${link(String(ctx.ticketsUrl ?? '#'), 'Ver mis entradas')}`;
      }

      case EmailTemplate.UPCOMING_RELEASE:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p><strong>${this.escape(String(ctx.movieTitle ?? 'La película'))}</strong> ya está en cartelera de tu ciudad.</p>
${link(String(ctx.movieUrl ?? '#'), 'Ver en cartelera')}`;

      default:
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>${this.escape(String(ctx.message ?? 'Tienes una nueva notificación de Multicine.'))}</p>`;
    }
  }

  /** Escapa HTML para evitar XSS en plantillas. */
  private static escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Texto plano aproximado desde HTML simple. */
  private static stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}
