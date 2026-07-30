/**
 * Estados del carrito de compras (HU-011 / HU-013).
 *
 * - `ACTIVE`: único permitido por usuario (RN-044); sillas siguen bloqueadas (RN-045).
 * - `CHECKOUT`: pago iniciado; espera webhook de pasarela (HU-013).
 * - `COMPLETED`: pago aprobado; sillas vendidas (HU-013).
 * - `EXPIRED`: caducó por inactividad ~10 min (RN-046) o locks liberados.
 * - `CANCELLED`: el usuario lo eliminó (`DELETE /cart`) o pago rechazado (RN-054).
 */
export enum CartStatus {
  ACTIVE = 'ACTIVE',
  CHECKOUT = 'CHECKOUT',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}
