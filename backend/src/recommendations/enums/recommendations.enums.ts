/**
 * Enums del motor de recomendaciones personalizadas (HU-022).
 */

/**
 * Origen de una señal usada al rankear.
 * Útil para explicar el feed al usuario (transparencia RN-097).
 */
export enum RecommendationSignalSource {
  /** Derivado de órdenes PAID autorizadas. */
  PURCHASE_HISTORY = 'PURCHASE_HISTORY',
  /** Preferencia explícita del usuario. */
  EXPLICIT_PREFERENCE = 'EXPLICIT_PREFERENCE',
  /** Perfil (cine favorito) autorizado. */
  PROFILE = 'PROFILE',
  /** Fallback por popularidad / rating en cartelera. */
  POPULARITY = 'POPULARITY',
}
