import { MovieFunctionsResponse } from '../../movies/dto/movie-functions-response';
import { TicketView } from '../../tickets/dto/ticket-response';

/** Compra confirmada listada en “Mis compras” (HU-016). */
export type PaidOrderSummary = {
  orderId: string;
  status: string;
  movieId: string;
  movieTitle: string;
  showtimeId: string;
  startsAt: string;
  cinemaName: string | null;
  format: string;
  language: string;
  seatCount: number;
  seats: Array<{ seatId: string; seatLabel: string }>;
  ticketsSubtotal: number;
  total: number;
  currency: string;
  /** RN-065: true si faltan ≥ 1 h para el inicio. */
  canReschedule: boolean;
  rescheduleBlockedReason: string | null;
  validTicketCount: number;
  createdAt: string;
};

export type PaidOrdersListResponse = {
  items: PaidOrderSummary[];
  total: number;
};

/** Funciones alternativas + contexto de la orden. */
export type AvailableFunctionsForOrderResponse = {
  orderId: string;
  movieId: string;
  currentShowtimeId: string;
  canReschedule: boolean;
  rescheduleBlockedReason: string | null;
  functions: MovieFunctionsResponse;
};

/** Resultado de confirmar el cambio de función. */
export type RescheduleResult = {
  orderId: string;
  oldShowtimeId: string;
  newShowtimeId: string;
  priceDifference: number;
  creditApplied: number;
  surchargeAmount: number;
  walletBalance: string | null;
  cancelledTicketIds: string[];
  tickets: TicketView[];
  auditId: string;
  message: string;
};
