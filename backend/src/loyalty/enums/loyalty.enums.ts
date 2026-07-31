/**
 * Enums del programa de fidelización (HU-023).
 */

/**
 * Tipo de movimiento en el ledger de puntos.
 */
export enum PointLedgerType {
  /** Acumulación por compra pagada. */
  EARN = 'EARN',
  /** Redención en carrito (entradas/confitería). */
  REDEEM_CART = 'REDEEM_CART',
  /** Redención a billetera / bono (COP). */
  REDEEM_WALLET = 'REDEEM_WALLET',
  /** Vencimiento a los 12 meses (RN-099). */
  EXPIRE = 'EXPIRE',
}

/**
 * Destino de `POST /points` (redención explícita).
 */
export enum PointsRedeemDestination {
  /** Crédito COP en billetera (bonos / saldo a favor). */
  WALLET = 'WALLET',
}
