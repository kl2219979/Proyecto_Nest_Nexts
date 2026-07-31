import type { UserRole } from '../enums/user.enums';

/**
 * Payload firmado dentro del Access JWT (HU-007 / RN-028 + HU-020).
 *
 * `sub` = userId (estándar JWT).
 * `role` evita consultar la DB en cada request para RBAC (RN-088).
 */
export type JwtPayload = {
  /** Subject: UUID del usuario. */
  sub: string;
  /** Email del usuario (informativo). */
  email: string;
  /** Rol RBAC embebido (HU-020). */
  role: UserRole;
};
