/**
 * Enums del dominio PQRS (HU-028).
 *
 * Categorías y estados tipados evitan strings mágicos en queries y DTOs.
 */

/**
 * Categoría de la solicitud (backlog HU-028).
 *
 * - `PETITION` — Petición
 * - `COMPLAINT` — Queja
 * - `CLAIM` — Reclamo
 * - `SUGGESTION` — Sugerencia
 * - `COMPLIMENT` — Felicitación
 */
export enum PqrsCategory {
  PETITION = 'PETITION',
  COMPLAINT = 'COMPLAINT',
  CLAIM = 'CLAIM',
  SUGGESTION = 'SUGGESTION',
  COMPLIMENT = 'COMPLIMENT',
}

/**
 * Ciclo de vida del caso PQRS.
 *
 * Flujo típico: `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`.
 * `CANCELLED` cierra sin resolución (cliente o staff).
 */
export enum PqrsStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Tipo de evento en el historial del caso (seguimiento).
 */
export enum PqrsHistoryEvent {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
}

/** Etiquetas en español para correos / UI. */
export const PQRS_CATEGORY_LABEL: Record<PqrsCategory, string> = {
  [PqrsCategory.PETITION]: 'Petición',
  [PqrsCategory.COMPLAINT]: 'Queja',
  [PqrsCategory.CLAIM]: 'Reclamo',
  [PqrsCategory.SUGGESTION]: 'Sugerencia',
  [PqrsCategory.COMPLIMENT]: 'Felicitación',
};

/** Etiquetas de estado en español. */
export const PQRS_STATUS_LABEL: Record<PqrsStatus, string> = {
  [PqrsStatus.OPEN]: 'Abierta',
  [PqrsStatus.IN_PROGRESS]: 'En proceso',
  [PqrsStatus.RESOLVED]: 'Resuelta',
  [PqrsStatus.CLOSED]: 'Cerrada',
  [PqrsStatus.CANCELLED]: 'Cancelada',
};

/**
 * SLA por defecto en horas (RN-111) si aún no hay fila en `pqrs_sla_configs`.
 */
export const DEFAULT_PQRS_SLA_HOURS: Record<PqrsCategory, number> = {
  [PqrsCategory.PETITION]: 72,
  [PqrsCategory.COMPLAINT]: 48,
  [PqrsCategory.CLAIM]: 48,
  [PqrsCategory.SUGGESTION]: 120,
  [PqrsCategory.COMPLIMENT]: 168,
};
