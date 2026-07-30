import {
  SeatRuntimeStatus,
  SeatType,
} from '../enums/seat.enums';

/**
 * Silla en el mapa de una función (`GET /functions/:id/seats`).
 */
export type SeatMapItem = {
  id: string;
  label: string;
  rowLabel: string;
  seatNumber: number;
  gridRow: number;
  gridColumn: number;
  seatType: SeatType;
  status: SeatRuntimeStatus;
  /** ISO de caducidad si status es SELECTED o LOCKED. */
  lockExpiresAt: string | null;
};

/**
 * Resumen económico de la selección (antes del carrito HU-011).
 */
export type SeatSelectionSummary = {
  seatCount: number;
  unitPrice: number;
  subtotal: number;
  currency: 'COP';
  seats: Array<{
    id: string;
    label: string;
    seatType: SeatType;
    unitPrice: number;
  }>;
};

/**
 * Respuesta del plano de sala.
 */
export type SeatMapResponse = {
  functionId: string;
  movieId: string;
  room: {
    id: string;
    name: string;
    roomType: string;
  };
  cinema: {
    id: string;
    name: string;
  };
  startsAt: string;
  unitPrice: number;
  currency: 'COP';
  maxSeatsPerOrder: number;
  capacity: number;
  availableCount: number;
  seats: SeatMapItem[];
  /** Resumen de la selección del usuario actual (si envió JWT). */
  mySelection: SeatSelectionSummary | null;
};

/**
 * Reserva temporal activa (`GET /reservations`, `POST .../seats`).
 */
export type ReservationResponse = {
  reservationId: string;
  functionId: string;
  movieId: string;
  startsAt: string;
  expiresAt: string;
  room: { id: string; name: string };
  cinema: { id: string; name: string };
  summary: SeatSelectionSummary;
};

/**
 * Resultado de liberar sillas.
 */
export type ReleaseSeatsResult = {
  releasedCount: number;
  reservationIds: string[];
};
