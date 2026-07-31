/**
 * Constantes de negocio del chatbot (HU-021).
 */

/** Máximo de recomendaciones por respuesta (tarjetas con poster/trailer). */
export const AI_MAX_RECOMMENDATIONS = 3;

/** Límite blando de latencia en ms (RN-094: &lt; 5 s). */
export const AI_MAX_LATENCY_MS = 5_000;

/** Máximo de mensajes de historial enviados al adaptador como contexto. */
export const AI_HISTORY_CONTEXT_LIMIT = 12;

/**
 * Edad mínima por clasificación etaria (RN-093).
 * Clasificaciones no listadas se tratan como 18+ (conservador).
 */
export const CLASSIFICATION_MIN_AGE: Record<string, number> = {
  T: 0,
  '7+': 7,
  '12+': 12,
  '15+': 15,
  '18+': 18,
};

/** Sinopsis truncada en tarjeta de recomendación (chars). */
export const AI_SYNOPSIS_MAX_CHARS = 280;

/** Prefijo de deep-link de compra para el frontend. */
export const AI_BUY_PATH_PREFIX = '/movies';
