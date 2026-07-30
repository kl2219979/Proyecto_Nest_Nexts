/**
 * Enums compartidos del dominio cartelera (HU-003).
 *
 * Se usan como columnas TypeORM (`type: 'enum'` / varchar)
 * y como valores de query params en los filtros.
 */

/** Formatos de proyección disponibles en una función. */
export enum MovieFormat {
  TWO_D = '2D',
  THREE_D = '3D',
  IMAX = 'IMAX',
  VIP = 'VIP',
}

/**
 * Tipo de audio de la función.
 * Distinto del idioma: una función puede ser EN + SUBTITLED.
 */
export enum AudioType {
  SUBTITLED = 'SUBTITLED',
  DUBBED = 'DUBBED',
}

/** Tipo de sala (filtro “tipo de sala” del backlog). */
export enum RoomType {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
  IMAX = 'IMAX',
}
