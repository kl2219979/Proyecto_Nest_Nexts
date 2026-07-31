/**
 * Constantes de Cine Flash (HU-019 / RN-080…086).
 */

/** Umbral de ocupación bajo el cual se activa el flash (RN-080). */
export const CINE_FLASH_OCCUPANCY_THRESHOLD = 0.6;

/** Horizontes en horas antes de la función (RN-080: 1 h). */
export const CINE_FLASH_LEAD_HOURS = 1;

/**
 * Ventana ± alrededor del horizonte (cron cada 5 min).
 * Misma holgura que recordatorios HU-015.
 */
export const CINE_FLASH_WINDOW_MS = 15 * 60 * 1000;

/** Descuento automático sobre entradas (20% OFF). */
export const CINE_FLASH_DISCOUNT_PERCENT = 20;

/** Máximo de entradas por compra bajo Cine Flash (RN-081). */
export const CINE_FLASH_MAX_TICKETS = 3;

/** Prefijo de códigos sintéticos `FLASH-XXXXXXXX`. */
export const CINE_FLASH_CODE_PREFIX = 'FLASH-';
