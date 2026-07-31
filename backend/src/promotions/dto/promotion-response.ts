import { MembershipLevel } from '../../membership/enums/membership.enums';
import { MovieFormat } from '../../movies/enums/movie.enums';
import { DiscountKind, PromotionType } from '../enums/promotion.enums';

/**
 * Vista pública / admin de una promoción (HU-026).
 */
export type PromotionResponse = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: PromotionType;
  discountKind: DiscountKind;
  discountValue: number;
  stackable: boolean;
  startsAt: string;
  endsAt: string;
  maxUsesPerUser: number | null;
  maxTotalUses: number | null;
  isActive: boolean;
  requiresCode: boolean;
  cityId: string | null;
  cinemaId: string | null;
  roomId: string | null;
  movieId: string | null;
  genreId: string | null;
  format: MovieFormat | null;
  /** Scope por función (HU-019 Cine Flash). */
  showtimeId: string | null;
  appliesToTickets: boolean;
  appliesToSnacks: boolean;
  minMembershipLevel: MembershipLevel | null;
  birthdayWindowDays: number;
  incompatibleWithPoints: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Promo aplicable a una función (RN-038 / `GET /functions/:id/prices`).
 */
export type FunctionPromotionView = {
  code: string | null;
  name: string;
  description: string;
  discountAmount: number;
  discountKind: DiscountKind;
  discountValue: number;
  stackable: boolean;
  type: PromotionType;
};

/**
 * Contexto de compra para validar scopes y calcular descuento.
 */
export type PromoEvaluationContext = {
  userId: string;
  now?: Date;
  ticketsSubtotal: number;
  snacksSubtotal: number;
  /** Precios unitarios de entradas (para 2x1). */
  ticketUnitPrices: number[];
  cityId?: string | null;
  cinemaId?: string | null;
  roomId?: string | null;
  movieId?: string | null;
  genreIds?: string[];
  format?: MovieFormat | null;
  /** Función del carrito / precios (scope HU-019). */
  showtimeId?: string | null;
  membershipLevel?: MembershipLevel | null;
  birthDate?: string | null;
};

/**
 * Resultado de validar + calcular una promo sobre un carrito.
 */
export type PromoApplicationResult = {
  promotionId: string;
  code: string | null;
  name: string;
  discountAmount: number;
  stackable: boolean;
  description: string | null;
  /** RN-100 / HU-023: bloquea acumulación y redención de puntos. */
  incompatibleWithPoints: boolean;
};
