import { MembershipLevel } from '../membership/enums/membership.enums';

/**
 * Constantes del programa de fidelización (HU-023).
 *
 * Valores educativos fijos; un admin formal de reglas quedaría fuera de alcance.
 */

/** COP de compra neta necesarios para 1 punto base (antes del multiplicador de nivel). */
export const COP_PER_BASE_POINT = 1000;

/** 1 punto redimido = 10 COP de descuento / crédito. */
export const COP_PER_REDEEMED_POINT = 10;

/** Meses de vigencia de un lote EARN (RN-099). */
export const POINTS_EXPIRY_MONTHS = 12;

/**
 * Multiplicador de acumulación según nivel actual.
 * Bronce 1× · Plata 1.25× · Oro 1.5× · Platino 2×.
 */
export const EARN_MULTIPLIER: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONZE]: 1,
  [MembershipLevel.SILVER]: 1.25,
  [MembershipLevel.GOLD]: 1.5,
  [MembershipLevel.PLATINUM]: 2,
};

/**
 * Umbrales de puntos de por vida (suma de EARN) para subir de nivel (RN-101).
 * El nivel se recalcula automáticamente tras cada acumulación.
 */
export const LEVEL_LIFETIME_THRESHOLDS: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONZE]: 0,
  [MembershipLevel.SILVER]: 500,
  [MembershipLevel.GOLD]: 2000,
  [MembershipLevel.PLATINUM]: 5000,
};

/** Orden de niveles de menor a mayor. */
export const LEVEL_ORDER: MembershipLevel[] = [
  MembershipLevel.BRONZE,
  MembershipLevel.SILVER,
  MembershipLevel.GOLD,
  MembershipLevel.PLATINUM,
];
