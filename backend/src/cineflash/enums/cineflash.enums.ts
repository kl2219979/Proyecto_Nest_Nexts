/**
 * Acciones auditadas de Cine Flash (RN-085).
 */
export enum CineFlashAuditAction {
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',
}

/**
 * Motivo de activación / apagado (bitácora).
 */
export enum CineFlashAuditReason {
  /** Ocupación &lt; 60% a ~1 h del inicio. */
  OCCUPANCY_LOW = 'OCCUPANCY_LOW',
  /** La función ya inició. */
  SHOWTIME_STARTED = 'SHOWTIME_STARTED',
  /** Sala llena (`soldSeats >= capacity`). */
  SOLD_OUT = 'SOLD_OUT',
  /** Proceso manual (`POST /cineflash/process`). */
  MANUAL_PROCESS = 'MANUAL_PROCESS',
}
