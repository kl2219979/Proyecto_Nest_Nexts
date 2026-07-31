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
  [EmailTemplate.PQRS_CREATED]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.PQRS_UPDATED]: EmailCategory.TRANSACTIONAL,
  [EmailTemplate.PQRS_RESOLVED]: EmailCategory.TRANSACTIONAL,
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
  [EmailTemplate.PQRS_CREATED]: 'Recibimos tu PQRS — Multicine',
  [EmailTemplate.PQRS_UPDATED]: 'Actualización de tu PQRS — Multicine',
  [EmailTemplate.PQRS_RESOLVED]: 'Tu PQRS fue resuelta — Multicine',
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

      case EmailTemplate.FUNCTION_CHANGED: {
        const movie = String(ctx.movieTitle ?? 'tu película');
        const credit = Number(ctx.creditApplied ?? 0);
        const surcharge = Number(ctx.surchargeAmount ?? 0);
        let moneyNote = '';
        if (credit > 0) {
          moneyNote = `<p>Se acreditaron <strong>${this.escape(String(ctx.creditApplied))}</strong> a tu billetera Multicine.</p>`;
        } else if (surcharge > 0) {
          moneyNote = `<p>Excedente del cambio: <strong>${this.escape(String(ctx.surchargeAmount))}</strong>.</p>`;
        }
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Tu función de <strong>${this.escape(movie)}</strong> fue reprogramada.</p>
<ul>
  <li><strong>Horario anterior:</strong> ${this.escape(String(ctx.oldStartsAt ?? ''))}</li>
  <li><strong>Nuevo horario:</strong> ${this.escape(String(ctx.newStartsAt ?? ''))}</li>
  <li><strong>Orden:</strong> ${this.escape(String(ctx.orderId ?? ''))}</li>
</ul>
<p>Los QR anteriores quedaron anulados. Usa las nuevas entradas.</p>
${moneyNote}
${link(String(ctx.ticketsUrl ?? '#'), 'Ver mis entradas')}`;
      }

      case EmailTemplate.TICKET_TRANSFER: {
        const movie = String(ctx.movieTitle ?? 'tu película');
        const variant = String(ctx.variant ?? 'request');
        const seatCount = String(ctx.seatCount ?? '1');
        const starts = String(ctx.startsAt ?? '');
        if (variant === 'invite') {
          return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p><strong>${this.escape(String(ctx.fromEmail ?? 'Un usuario Multicine'))}</strong> quiere transferirte ${this.escape(seatCount)} entrada(s) de <strong>${this.escape(movie)}</strong>.</p>
<p><strong>Función:</strong> ${this.escape(starts)}</p>
<p>Aún no tienes cuenta. Regístrate con este mismo correo y, tras activarla, acepta la cesión.</p>
${link(String(ctx.registerUrl ?? '#'), 'Crear mi cuenta')}
${link(String(ctx.acceptUrl ?? '#'), 'Ya tengo cuenta — aceptar')}`;
        }
        if (variant === 'accepted_recipient') {
          return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Aceptaste la transferencia de <strong>${this.escape(movie)}</strong>. Ya tienes ${this.escape(seatCount)} entrada(s) con QR nuevo.</p>
<p><strong>Función:</strong> ${this.escape(starts)}</p>
${link(String(ctx.ticketsUrl ?? '#'), 'Ver mis entradas')}`;
        }
        if (variant === 'accepted_sender') {
          return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p><strong>${this.escape(String(ctx.toName ?? 'El destinatario'))}</strong> aceptó tu cesión de <strong>${this.escape(movie)}</strong>. Tus QR anteriores quedaron anulados.</p>
<p><strong>Función:</strong> ${this.escape(starts)}</p>`;
        }
        if (variant === 'sender_notice') {
          return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Solicitaste transferir ${this.escape(seatCount)} entrada(s) de <strong>${this.escape(movie)}</strong> a <strong>${this.escape(String(ctx.toName ?? ''))}</strong> (${this.escape(String(ctx.toEmail ?? ''))}).</p>
<p>El QR actual sigue vigente hasta que el destinatario acepte (RN-073).</p>`;
        }
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p><strong>${this.escape(String(ctx.fromEmail ?? 'Un usuario Multicine'))}</strong> te transfiere ${this.escape(seatCount)} entrada(s) de <strong>${this.escape(movie)}</strong>.</p>
<p><strong>Función:</strong> ${this.escape(starts)}</p>
<p>Debes aceptar para recibir el nuevo QR (RN-073). El QR anterior se anulará al aceptar.</p>
${link(String(ctx.acceptUrl ?? '#'), 'Aceptar transferencia')}`;
      }

      case EmailTemplate.CINE_FLASH: {
        const movie = String(ctx.movieTitle ?? 'una película');
        const pct = String(ctx.discountPercent ?? 20);
        const flash = String(ctx.flashPrice ?? '');
        const base = String(ctx.basePrice ?? '');
        const maxTickets = String(ctx.maxTickets ?? 3);
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>🔥 <strong>Cine Flash</strong> activado: <strong>${this.escape(pct)}% OFF</strong> en entradas de <strong>${this.escape(movie)}</strong>.</p>
<ul>
  <li><strong>Horario:</strong> ${this.escape(String(ctx.startsAt ?? ''))}</li>
  <li><strong>Complejo:</strong> ${this.escape(String(ctx.cinemaName ?? ''))}</li>
  <li><strong>Sala:</strong> ${this.escape(String(ctx.roomName ?? ''))}</li>
  <li><strong>Precio:</strong> $${this.escape(base)} → $${this.escape(flash)} COP</li>
  <li><strong>Máximo:</strong> ${this.escape(maxTickets)} entradas · solo entradas · no acumulable</li>
</ul>
<p>Solo por tiempo limitado — hasta que inicie la función o se llene la sala.</p>
${link(String(ctx.cineflashUrl ?? '#'), 'Ver Cine Flash')}
${link(String(ctx.movieUrl ?? '#'), 'Ver película')}`;
      }

      case EmailTemplate.GIFTCARD: {
        const code = String(ctx.code ?? '');
        const value = String(ctx.faceValue ?? '');
        const theme = String(ctx.theme ?? 'GENERIC');
        const personal = ctx.message
          ? `<p style="font-style:italic;">“${this.escape(String(ctx.message))}”</p>`
          : '';
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p><strong>${this.escape(String(ctx.purchaserEmail ?? 'Alguien'))}</strong> te envió un bono de regalo Multicine.</p>
<p><strong>Tema:</strong> ${this.escape(theme)} · <strong>Valor:</strong> $${this.escape(value)} COP</p>
${personal}
<p><strong>Código:</strong> ${this.escape(code)}</p>
<p><strong>QR:</strong> ${this.escape(String(ctx.qrPayload ?? code))}</p>
<p><strong>Válido hasta:</strong> ${this.escape(String(ctx.expiresAt ?? ''))}</p>
<p>Puedes redimirlo a tu billetera o aplicarlo en el carrito (entradas y confitería).</p>
${link(String(ctx.redeemUrl ?? '#'), 'Ver / redimir bono')}`;
      }

      case EmailTemplate.PQRS_CREATED: {
        const ticket = String(ctx.ticketNumber ?? '');
        const category = String(ctx.categoryLabel ?? 'PQRS');
        const subject = String(ctx.subject ?? '');
        const sla = String(ctx.slaDueAt ?? '');
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Recibimos tu <strong>${this.escape(category)}</strong> con número <strong>${this.escape(ticket)}</strong>.</p>
<p><strong>Asunto:</strong> ${this.escape(subject)}</p>
<p><strong>Estado:</strong> ${this.escape(String(ctx.statusLabel ?? 'Abierta'))}</p>
<p><strong>Plazo de atención (SLA):</strong> ${this.escape(sla)}</p>
<p>Te avisaremos por correo cuando haya novedades.</p>
${link(String(ctx.pqrsUrl ?? '#'), 'Ver seguimiento')}`;
      }

      case EmailTemplate.PQRS_UPDATED: {
        const ticket = String(ctx.ticketNumber ?? '');
        const summary = String(ctx.updateSummary ?? 'Hay una actualización en tu caso');
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Tu caso <strong>${this.escape(ticket)}</strong> tiene una novedad.</p>
<p>${this.escape(summary)}</p>
<p><strong>Estado actual:</strong> ${this.escape(String(ctx.statusLabel ?? ''))}</p>
${link(String(ctx.pqrsUrl ?? '#'), 'Ver seguimiento')}`;
      }

      case EmailTemplate.PQRS_RESOLVED: {
        const ticket = String(ctx.ticketNumber ?? '');
        return `<p>Hola <strong>${this.escape(name)}</strong>,</p>
<p>Tu caso <strong>${this.escape(ticket)}</strong> fue marcado como <strong>${this.escape(String(ctx.statusLabel ?? 'Resuelta'))}</strong>.</p>
<p><strong>Asunto:</strong> ${this.escape(String(ctx.subject ?? ''))}</p>
<p>Gracias por ayudarnos a mejorar Multicine.</p>
${link(String(ctx.pqrsUrl ?? '#'), 'Ver detalle')}`;
      }

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
