/**
 * Estados de una entrada digital (HU-014 / RN-057…060).
 *
 * `USED` lo marcará el escaneo en puerta (HU-024); aquí solo se modela
 * para que el QR sea de un solo uso (RN-058 / RN-060).
 */
export enum TicketStatus {
  /** Lista para ingreso; QR válido. */
  VALID = 'VALID',
  /** Ya escaneada en puerta (RN-058 / RN-060). */
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
