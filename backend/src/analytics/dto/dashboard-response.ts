import { DashboardPeriod } from '../enums/dashboard.enums';

/** Metadatos del rango consultado. */
export interface DashboardMeta {
  period: DashboardPeriod;
  from: string;
  to: string;
  cityId: string | null;
  cinemaId: string | null;
  generatedAt: string;
}

/** Totales de ventas / ingresos en el rango. */
export interface DashboardSalesKpi {
  ordersPaid: number;
  ticketsRevenue: number;
  snacksRevenue: number;
  giftcardDiscountApplied: number;
  revenue: number;
}

/** Entradas digitales emitidas / usadas / anuladas. */
export interface DashboardTicketsKpi {
  issued: number;
  used: number;
  cancelled: number;
}

/** Ocupación agregada de funciones en el rango. */
export interface DashboardOccupationKpi {
  showtimes: number;
  soldSeats: number;
  capacity: number;
  occupancyPercent: number;
}

/** Confitería vendida (órdenes PAID). */
export interface DashboardSnacksKpi {
  itemsSold: number;
  revenue: number;
}

/** Actividad Cine Flash en el rango. */
export interface DashboardCineFlashKpi {
  activations: number;
  deactivations: number;
  activePromos: number;
}

/** Bonos de regalo. */
export interface DashboardGiftcardsKpi {
  sold: number;
  faceValueSold: number;
  redeemedFully: number;
  remainingBalance: number;
}

/** Membresías (stock actual + altas en el rango). */
export interface DashboardMembershipsKpi {
  total: number;
  createdInPeriod: number;
  byLevel: { level: string; count: number }[];
}

/** Usuarios activos / registrados. */
export interface DashboardUsersKpi {
  registeredInPeriod: number;
  verifiedActive: number;
  loggedInPeriod: number;
}

/**
 * Conversión de checkout: órdenes PAID / intentos cerrados
 * (PAID + FAILED + CANCELLED) en el rango.
 */
export interface DashboardConversionKpi {
  paid: number;
  failed: number;
  cancelled: number;
  ratePercent: number;
}

/** Cancelaciones de órdenes y tickets. */
export interface DashboardCancellationsKpi {
  orders: number;
  tickets: number;
}

/** Transferencias de entradas. */
export interface DashboardTransfersKpi {
  requested: number;
  accepted: number;
  pending: number;
}

/** Punto de serie temporal para gráficos. */
export interface DashboardSeriesPoint {
  bucket: string;
  orders: number;
  revenue: number;
  tickets: number;
}

/** Ranking genérico. */
export interface DashboardTopRow {
  id: string;
  name: string;
  value: number;
  secondary?: number;
}

/** Comparativo vs. período anterior de igual duración. */
export interface DashboardComparison {
  previousFrom: string;
  previousTo: string;
  previous: {
    revenue: number;
    ordersPaid: number;
    ticketsIssued: number;
    occupancyPercent: number;
  };
  deltas: {
    revenuePercent: number | null;
    ordersPercent: number | null;
    ticketsPercent: number | null;
    occupancyPoints: number | null;
  };
}

/**
 * Payload completo de `GET /dashboard` (HU-025).
 *
 * El frontend renderiza gráficos a partir de `series` y `tops`;
 * los KPI numéricos alimentan las tarjetas del panel gerencial.
 */
export interface DashboardResponse {
  meta: DashboardMeta;
  kpis: {
    sales: DashboardSalesKpi;
    tickets: DashboardTicketsKpi;
    occupation: DashboardOccupationKpi;
    movies: { withSales: number; showtimes: number };
    snacks: DashboardSnacksKpi;
    cineFlash: DashboardCineFlashKpi;
    giftcards: DashboardGiftcardsKpi;
    memberships: DashboardMembershipsKpi;
    activeUsers: DashboardUsersKpi;
    conversion: DashboardConversionKpi;
    cancellations: DashboardCancellationsKpi;
    transfers: DashboardTransfersKpi;
    revenue: {
      total: number;
      tickets: number;
      snacks: number;
      giftcardsFaceValue: number;
    };
  };
  series: DashboardSeriesPoint[];
  tops: {
    movies: DashboardTopRow[];
    cities: DashboardTopRow[];
    cinemas: DashboardTopRow[];
    snacks: DashboardTopRow[];
  };
  comparison: DashboardComparison;
}
