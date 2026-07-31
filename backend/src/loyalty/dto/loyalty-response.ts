import { MembershipLevel } from '../../membership/enums/membership.enums';
import { MembershipBenefit } from '../../membership/membership-benefits';
import { PointLedgerType } from '../enums/loyalty.enums';

/** Ítem del historial de puntos (`GET /points` / `GET /membership`). */
export type PointsHistoryItem = {
  id: string;
  type: PointLedgerType;
  points: number;
  remaining: number;
  amountCop: number | null;
  orderId: string | null;
  description: string;
  balanceAfter: number;
  expiresAt: string | null;
  createdAt: string;
};

/** Resumen de saldo y progreso de nivel. */
export type PointsBalanceResponse = {
  available: number;
  lifetimeEarned: number;
  level: MembershipLevel;
  nextLevel: MembershipLevel | null;
  pointsToNextLevel: number | null;
  earnMultiplier: number;
  copPerRedeemedPoint: number;
  history: PointsHistoryItem[];
};

/** Resultado de `POST /points` (redención a billetera). */
export type RedeemPointsResponse = {
  pointsRedeemed: number;
  amountCop: number;
  destination: 'WALLET';
  walletBalance: string;
  available: number;
};

/** Nivel del catálogo `GET /membership/levels`. */
export type MembershipLevelInfo = {
  level: MembershipLevel;
  lifetimePointsRequired: number;
  earnMultiplier: number;
  benefits: MembershipBenefit[];
};

/** Catálogo de niveles. */
export type MembershipLevelsResponse = {
  levels: MembershipLevelInfo[];
  pointsExpiryMonths: number;
  copPerBasePoint: number;
  copPerRedeemedPoint: number;
};
