/**
 * Payload firmado dentro del Access JWT (HU-007 / RN-028).
 *
 * `sub` = userId (estándar JWT).
 * El resto es claim mínimo para evitar consultas en cada request.
 */
export type JwtPayload = {
  /** Subject: UUID del usuario. */
  sub: string;
  /** Email del usuario (informativo). */
  email: string;
};
