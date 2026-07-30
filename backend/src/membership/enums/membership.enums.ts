/**
 * Enums del dominio de membresía digital (HU-006).
 */

/**
 * Estado de la membresía.
 * Se crea en `ACTIVE` al registrar (RN-025); la cuenta de usuario
 * puede seguir inactiva hasta verificar el correo (RN-024).
 */
export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

/**
 * Nivel inicial Bronce; subidas de nivel son HU-023.
 */
export enum MembershipLevel {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}
