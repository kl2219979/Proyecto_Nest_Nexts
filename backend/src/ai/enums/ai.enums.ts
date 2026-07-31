/**
 * Enums del chatbot de recomendaciones (HU-021).
 */

/** Rol de un mensaje en la conversación. */
export enum ChatMessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

/**
 * Intención detectada por el adaptador de IA (stub o proveedor real).
 * El dominio usa esto para elegir fuentes (cartelera, promos, escalado).
 */
export enum ChatIntent {
  /** Recomendación general / por gustos. */
  RECOMMEND = 'RECOMMEND',
  /** ¿Qué hay hoy? */
  TODAY = 'TODAY',
  /** Películas para niños / familia. */
  KIDS = 'KIDS',
  /** Funciones después de cierta hora. */
  AFTER_HOUR = 'AFTER_HOUR',
  /** Listar promociones vigentes. */
  PROMOTIONS = 'PROMOTIONS',
  /** Salas VIP disponibles. */
  VIP = 'VIP',
  /** Consulta de membresía / beneficios. */
  MEMBERSHIP = 'MEMBERSHIP',
  /** Escalar a soporte humano (RN-095). */
  ESCALATE = 'ESCALATE',
  /** Saludo / ayuda / pregunta abierta. */
  GREETING = 'GREETING',
}
