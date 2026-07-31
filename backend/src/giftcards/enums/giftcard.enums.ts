/**
 * Estados de un bono de regalo digital (HU-018).
 */
export enum GiftcardStatus {
  /** Creado; esperando confirmación de pasarela. */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  /**
   * Pagado y redimible.
   * El correo puede ir inmediato o quedar programado (`scheduledSendAt`).
   */
  ACTIVE = 'ACTIVE',
  /** Saldo agotado (RN-077). */
  REDEEMED = 'REDEEMED',
  /** Pasó `expiresAt` (RN-078). */
  EXPIRED = 'EXPIRED',
  /** Pago rechazado o anulado. */
  CANCELLED = 'CANCELLED',
}

/**
 * Diseño temático del bono (HU-018).
 */
export enum GiftcardTheme {
  BIRTHDAY = 'BIRTHDAY',
  CHRISTMAS = 'CHRISTMAS',
  ANNIVERSARY = 'ANNIVERSARY',
  VALENTINE = 'VALENTINE',
  GENERIC = 'GENERIC',
}

/**
 * Valores prefijados de venta (COP).
 * También se admite valor personalizado en el DTO.
 */
export const GIFTCARD_PRESET_AMOUNTS = [20_000, 50_000, 100_000] as const;
