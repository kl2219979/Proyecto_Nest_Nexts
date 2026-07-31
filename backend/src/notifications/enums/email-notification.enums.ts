/**
 * Categoría del correo (HU-015 / RN-062).
 *
 * - `TRANSACTIONAL`: obligatorios (compra, activación, reset…). No se silencian
 *   con preferencias de marketing.
 * - `MARKETING`: promociones, Cine Flash, etc. Respetan `emailMarketing`.
 * - `UPCOMING`: avisos de estreno. Respetan `emailUpcoming`.
 */
export enum EmailCategory {
  TRANSACTIONAL = 'TRANSACTIONAL',
  MARKETING = 'MARKETING',
  UPCOMING = 'UPCOMING',
}

/**
 * Plantillas corporativas soportadas por el motor de correo (HU-015).
 *
 * Las de reservas futuras (cambio de función, transferencia…) quedan
 * listas para HU-016/017; hoy no hay endpoints que las disparen.
 */
export enum EmailTemplate {
  /** Registro + enlace de activación. */
  ACCOUNT_ACTIVATION = 'ACCOUNT_ACTIVATION',
  /** Cuenta ya verificada. */
  ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
  /** Recuperación de contraseña. */
  PASSWORD_RESET = 'PASSWORD_RESET',
  /** Contraseña cambiada con éxito. */
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  /** Perfil actualizado. */
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  /** Re-verificación tras cambio de email (RN-034). */
  EMAIL_REVERIFICATION = 'EMAIL_REVERIFICATION',
  /** Compra OK + enlaces a entradas/factura (RN-064). */
  PURCHASE_SUCCESS = 'PURCHASE_SUCCESS',
  /** Pago rechazado. */
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  /** Recordatorio 24 h antes de la función. */
  SHOWTIME_REMINDER_24H = 'SHOWTIME_REMINDER_24H',
  /** Recordatorio 2 h antes de la función. */
  SHOWTIME_REMINDER_2H = 'SHOWTIME_REMINDER_2H',
  /** Película pasó de UPCOMING a cartelera (RN-020). */
  UPCOMING_RELEASE = 'UPCOMING_RELEASE',
  /** Stubs para HUs posteriores. */
  FUNCTION_CHANGED = 'FUNCTION_CHANGED',
  TICKET_TRANSFER = 'TICKET_TRANSFER',
  CANCELLATION = 'CANCELLATION',
  REFUND = 'REFUND',
  CINE_FLASH = 'CINE_FLASH',
  PROMOTION = 'PROMOTION',
  GIFTCARD = 'GIFTCARD',
  MEMBERSHIP_BENEFITS = 'MEMBERSHIP_BENEFITS',
}

/**
 * Estado del envío en el historial (RN-061 / RN-063).
 */
export enum EmailNotificationStatus {
  /** En cola o reintentando. */
  PENDING = 'PENDING',
  /** Entregado al adaptador con éxito. */
  SENT = 'SENT',
  /** Falló tras agotar reintentos (máx. 3). */
  FAILED = 'FAILED',
  /** Omitido por preferencias (solo marketing/upcoming). */
  SKIPPED = 'SKIPPED',
}
