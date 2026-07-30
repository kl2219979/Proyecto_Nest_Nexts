/**
 * Categorías del catálogo de confitería (HU-012).
 *
 * Valores alineados al backlog; el admin CRUD (HU-020) podrá extenderlos.
 */
export enum SnackCategory {
  POPCORN = 'POPCORN',
  COMBO = 'COMBO',
  SODA = 'SODA',
  CANDY = 'CANDY',
  CHOCOLATE = 'CHOCOLATE',
  NACHOS = 'NACHOS',
  HOT_DOG = 'HOT_DOG',
  BURGER = 'BURGER',
  COFFEE = 'COFFEE',
  ICE_CREAM = 'ICE_CREAM',
}

/**
 * Etiquetas legibles para el frontend.
 */
export const SNACK_CATEGORY_LABELS: Record<SnackCategory, string> = {
  [SnackCategory.POPCORN]: 'Crispetas',
  [SnackCategory.COMBO]: 'Combos',
  [SnackCategory.SODA]: 'Gaseosas',
  [SnackCategory.CANDY]: 'Dulces',
  [SnackCategory.CHOCOLATE]: 'Chocolates',
  [SnackCategory.NACHOS]: 'Nachos',
  [SnackCategory.HOT_DOG]: 'Perros calientes',
  [SnackCategory.BURGER]: 'Hamburguesas',
  [SnackCategory.COFFEE]: 'Café',
  [SnackCategory.ICE_CREAM]: 'Helados',
};
