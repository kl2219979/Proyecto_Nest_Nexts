/**
 * Tipo físico de silla en el plano de la sala (HU-010).
 *
 * Distinto del *estado* runtime (`SeatRuntimeStatus`): el tipo es fijo
 * en el layout; el estado cambia según locks y ventas.
 */
export enum SeatType {
  /** Butaca estándar. */
  STANDARD = 'STANDARD',
  /** Butaca VIP (mayor confort / zona exclusiva). */
  VIP = 'VIP',
  /** Preferencial / movilidad reducida (RN-042). */
  PREFERENTIAL = 'PREFERENTIAL',
  /** Inhabilitada de forma permanente (no se vende). */
  DISABLED = 'DISABLED',
}

/**
 * Estado visible de una silla para una función concreta (HU-010).
 */
export enum SeatRuntimeStatus {
  /** Libre para seleccionar. */
  AVAILABLE = 'AVAILABLE',
  /** Seleccionada / bloqueada por el usuario actual. */
  SELECTED = 'SELECTED',
  /** Bloqueo temporal de otro usuario (RN-039 / RN-041). */
  LOCKED = 'LOCKED',
  /** Ya vendida (no seleccionable). */
  SOLD = 'SOLD',
  /** Inhabilitada en el layout. */
  DISABLED = 'DISABLED',
}

/**
 * Tipo de ocupación persistida en `seat_locks` (HU-010).
 */
export enum SeatLockStatus {
  /** Reserva temporal (~10 min, RN-039). */
  LOCKED = 'LOCKED',
  /** Vendida de forma definitiva (hasta reembolsos / HU-013). */
  SOLD = 'SOLD',
}

/**
 * Acción registrada en auditoría de bloqueos (HU-010 seguridad).
 */
export enum SeatLockAuditAction {
  LOCK = 'LOCK',
  RELEASE = 'RELEASE',
  EXPIRE = 'EXPIRE',
}
