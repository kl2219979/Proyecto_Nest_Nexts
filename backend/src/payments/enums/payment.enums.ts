/**
 * Medios de pago soportados en checkout (HU-013).
 *
 * Apple Pay / Google Pay quedan fuera (marcados “Futuro” en el backlog).
 */
export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PSE = 'PSE',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
}

/**
 * Estado del intento de cobro frente a la pasarela (HU-013).
 *
 * RN-053: solo `APPROVED` tras autorización del proveedor (webhook).
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Ciclo de vida de la orden de venta (HU-013).
 *
 * Tickets PDF/QR y factura electrónica se completan en HU-014;
 * aquí la orden es el registro de la venta y sus montos.
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Eventos de auditoría de pago (RN-055).
 */
export enum PaymentAuditEvent {
  CREATED = 'CREATED',
  GATEWAY_SENT = 'GATEWAY_SENT',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IDEMPOTENT_REPLAY = 'IDEMPOTENT_REPLAY',
  SEATS_SOLD = 'SEATS_SOLD',
  SEATS_RELEASED = 'SEATS_RELEASED',
  STOCK_DECREMENTED = 'STOCK_DECREMENTED',
}
