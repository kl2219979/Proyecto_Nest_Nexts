/**
 * Constantes del motor de recomendaciones personalizadas (HU-022).
 *
 * Valores educativos fijos; umbrales de peso son intencionadamente simples.
 */

/** Máximo de películas en el feed personalizado. */
export const RECOMMENDATIONS_FEED_LIMIT = 8;

/** Días por defecto para excluir películas ya vistas (RN-098). */
export const DEFAULT_RECENTLY_VIEWED_DAYS = 30;

/** Mínimo / máximo permitidos para `recentlyViewedDays`. */
export const MIN_RECENTLY_VIEWED_DAYS = 1;
export const MAX_RECENTLY_VIEWED_DAYS = 365;

/** Peso de géneros derivados del historial de compras. */
export const WEIGHT_HISTORY_GENRE = 3;

/** Peso de géneros declarados explícitamente en preferencias. */
export const WEIGHT_EXPLICIT_GENRE = 5;

/** Peso por coincidencia de formato preferido. */
export const WEIGHT_FORMAT = 2;

/** Peso por coincidencia de idioma preferido. */
export const WEIGHT_LANGUAGE = 2;

/** Peso por complejo preferido con función futura. */
export const WEIGHT_CINEMA = 2;

/** Peso por día de la semana habitual con función futura. */
export const WEIGHT_WEEKDAY = 1.5;

/** Peso por franja horaria habitual con función futura. */
export const WEIGHT_HOUR = 1.5;

/** Boost por rating de catálogo (0–10 → 0–1). */
export const WEIGHT_RATING = 0.5;

/** Historial de órdenes PAID a analizar (más recientes primero). */
export const HISTORY_ORDERS_LIMIT = 50;
