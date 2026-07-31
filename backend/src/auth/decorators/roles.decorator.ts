import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user.enums';

/** Clave de metadata leída por `RolesGuard`. */
export const ROLES_KEY = 'roles';

/**
 * Exige un rol mínimo (jerarquía HU-020 / RN-088).
 *
 * @param minimum - Rol mínimo; ADMIN implica SUPER_ADMIN también, etc.
 *
 * @example
 * `@Roles(UserRole.ADMIN)` — solo ADMIN y SUPER_ADMIN
 * `@Roles(UserRole.STAFF)` — STAFF, ADMIN y SUPER_ADMIN
 */
export const Roles = (minimum: UserRole) => SetMetadata(ROLES_KEY, minimum);
