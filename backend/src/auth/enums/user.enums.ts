/**
 * Enums del dominio de usuarios / registro (HU-006) + roles RBAC (HU-020).
 */

/** Tipo de documento de identidad solicitado en el formulario. */
export enum DocumentType {
  CC = 'CC',
  CE = 'CE',
  PASSPORT = 'PASSPORT',
  TI = 'TI',
  NIT = 'NIT',
}

/** Género opcional del perfil. */
export enum Gender {
  FEMALE = 'FEMALE',
  MALE = 'MALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/**
 * Rol de acceso (HU-020 / RN-088).
 *
 * Jerarquía (mayor incluye menor en `@Roles`):
 * SUPER_ADMIN > ADMIN > STAFF > CUSTOMER.
 */
export enum UserRole {
  /** Visitante / comprador del portal. */
  CUSTOMER = 'CUSTOMER',
  /** Colaborador de puerta (escaneo QR HU-024). */
  STAFF = 'STAFF',
  /** Backoffice: catálogos, ventas, reportes. */
  ADMIN = 'ADMIN',
  /** Administración total + asignación de roles. */
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/** Rango numérico para comparar jerarquía de roles. */
export const USER_ROLE_RANK: Record<UserRole, number> = {
  [UserRole.CUSTOMER]: 0,
  [UserRole.STAFF]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3,
};

/**
 * ¿El rol del usuario alcanza el mínimo exigido?
 *
 * @param userRole - Rol del JWT.
 * @param minimum - Rol mínimo del endpoint.
 * @returns `true` si `userRole` ≥ `minimum` en la jerarquía.
 */
export function roleSatisfies(
  userRole: UserRole,
  minimum: UserRole,
): boolean {
  return USER_ROLE_RANK[userRole] >= USER_ROLE_RANK[minimum];
}
