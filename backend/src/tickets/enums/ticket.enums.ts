/**
 * Estados de una entrada digital (HU-014 / HU-024 · RN-057…060 · RN-102).
 *
 * `USED` lo marca el escaneo en puerta (`POST /tickets/validate`).
 */
export enum TicketStatus {
  /** Lista para ingreso; QR válido. */
  VALID = 'VALID',
  /** Ya escaneada en puerta (RN-058 / RN-060 / RN-102). */
  USED = 'USED',
  /** Anulada (reprogramación HU-016 / transferencia HU-017). */
  CANCELLED = 'CANCELLED',
}

/**
 * Tipo de entrada mostrado en el PDF.
 * Hoy todas son STANDARD; VIP/preferencial pueden extenderse después.
 */
export enum TicketType {
  STANDARD = 'STANDARD',
  PREFERENTIAL = 'PREFERENTIAL',
}
