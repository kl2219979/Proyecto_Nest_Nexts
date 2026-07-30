/**
 * Enums del dominio de usuarios / registro (HU-006).
 */

/** Tipo de documento de identidad solicitado en el formulario. */
export enum DocumentType {
  CC = 'CC',
  CE = 'CE',
  PASSPORT = 'PASSPORT',
  TI = 'TI',
  NIT = 'NIT',
}

/** Género opcional del perfil. */
export enum Gender {
  FEMALE = 'FEMALE',
  MALE = 'MALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}
