import {
  MembershipLevel,
  MembershipStatus,
} from '../membership/enums/membership.enums';

/**
 * Beneficios vigentes por nivel de membresía (HU-007 login / RN-032 base).
 *
 * Detalle completo de perfil/QR = HU-008; aquí solo lo necesario
 * para mostrar al entrar al portal.
 */
export type MembershipBenefit = {
  code: string;
  description: string;
  discountPercent: number;
};

/**
 * Mapa estático nivel → beneficios activos.
 *
 * @param level - Nivel de la membresía del usuario.
 * @returns Lista de beneficios aplicables.
 */
export function benefitsForLevel(level: MembershipLevel): MembershipBenefit[] {
  const table: Record<MembershipLevel, MembershipBenefit[]> = {
    [MembershipLevel.BRONZE]: [
      {
        code: 'TICKET_5',
        description: '5% de descuento en entradas',
        discountPercent: 5,
      },
    ],
    [MembershipLevel.SILVER]: [
      {
        code: 'TICKET_10',
        description: '10% de descuento en entradas',
        discountPercent: 10,
      },
      {
        code: 'SNACK_5',
        description: '5% de descuento en confitería',
        discountPercent: 5,
      },
    ],
    [MembershipLevel.GOLD]: [
      {
        code: 'TICKET_15',
        description: '15% de descuento en entradas',
        discountPercent: 15,
      },
      {
        code: 'SNACK_10',
        description: '10% de descuento en confitería',
        discountPercent: 10,
      },
    ],
    [MembershipLevel.PLATINUM]: [
      {
        code: 'TICKET_20',
        description: '20% de descuento en entradas',
        discountPercent: 20,
      },
      {
        code: 'SNACK_15',
        description: '15% de descuento en confitería',
        discountPercent: 15,
      },
    ],
  };
  return table[level];
}

/**
 * Resumen de membresía en la respuesta de login.
 */
export type LoginMembershipSummary = {
  id: string;
  code: string;
  status: MembershipStatus;
  level: MembershipLevel;
  benefits: MembershipBenefit[];
};
