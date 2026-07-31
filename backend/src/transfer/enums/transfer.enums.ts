/**
 * Estados de una cesión de entradas (HU-017).
 */
export enum TicketTransferStatus {
  /** Esperando aceptación del destinatario (RN-073). */
  PENDING = 'PENDING',
  /** Aceptada: QR viejos anulados y nuevos emitidos (RN-074). */
  ACCEPTED = 'ACCEPTED',
  /** Cancelada por el emisor o por inconsistencia. */
  CANCELLED = 'CANCELLED',
  /** Ventana de 1 h vencida sin aceptar (RN-071). */
  EXPIRED = 'EXPIRED',
}
