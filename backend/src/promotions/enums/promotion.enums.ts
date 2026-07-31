/**
 * Enums del dominio de promociones y cupones (HU-026).
 */

/**
 * Catálogo de tipos de campaña (backlog HU-026).
 *
 * Define la “naturaleza” comercial; el cálculo real usa `DiscountKind`.
 */
export enum PromotionType {
  TWO_FOR_ONE = 'TWO_FOR_ONE',
  PERCENT_20 = 'PERCENT_20',
  PERCENT_30 = 'PERCENT_30',
  COMBO = 'COMBO',
  BIRTHDAY = 'BIRTHDAY',
  MEMBERSHIP = 'MEMBERSHIP',
  SEASON = 'SEASON',
  BLACK_FRIDAY = 'BLACK_FRIDAY',
  CINE_FLASH = 'CINE_FLASH',
  CUSTOM = 'CUSTOM',
}

/**
 * Cómo se calcula el descuento sobre el carrito / precio unitario.
 *
 * - `PERCENT`: `discountValue` = porcentaje (ej. 20).
 * - `FIXED`: `discountValue` = monto fijo en COP.
 * - `TWO_FOR_ONE`: una entrada gratis por cada par (la más barata del par).
 */
export enum DiscountKind {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
  TWO_FOR_ONE = 'TWO_FOR_ONE',
}
