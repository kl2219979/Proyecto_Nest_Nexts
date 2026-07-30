/**
 * Estados del carrito de compras (HU-011).
 *
 * - `ACTIVE`: único permitido por usuario (RN-044); sillas siguen bloqueadas (RN-045).
 * - `EXPIRED`: caducó por inactividad ~10 min (RN-046) o locks liberados.
 * - `CANCELLED`: el usuario lo eliminó (`DELETE /cart`).
 */
export enum CartStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}
