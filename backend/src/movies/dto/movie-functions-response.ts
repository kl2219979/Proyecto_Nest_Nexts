import {
  AudioType,
  MovieFormat,
  RoomType,
} from '../enums/movie.enums';

/**
 * Tipos de respuesta de selección de función (HU-009).
 */

/** Función seleccionable en `GET /movies/:id/functions`. */
export type MovieFunctionItem = {
  id: string;
  startsAt: string;
  /** Día local YYYY-MM-DD (útil para el selector de fecha). */
  date: string;
  format: MovieFormat;
  language: string;
  audioType: AudioType;
  /** Precio de esta función (varía por formato/sala/horario, RN-037). */
  price: number;
  capacity: number;
  soldSeats: number;
  availableSeats: number;
  isSoldOut: boolean;
  /**
   * `true` si aún no inició, está activa y no está agotada
   * (RN-035 / RN-036 + disponibilidad).
   */
  isSelectable: boolean;
  cinema: {
    id: string;
    name: string;
  };
  room: {
    id: string;
    name: string;
    roomType: RoomType;
  };
};

/** Facetas para que el frontend filtre sin recargar la página. */
export type MovieFunctionsFacets = {
  dates: string[];
  formats: MovieFormat[];
  languages: string[];
  audioTypes: AudioType[];
  roomTypes: RoomType[];
  cinemas: Array<{ id: string; name: string }>;
};

/** Respuesta de `GET /movies/:id/functions`. */
export type MovieFunctionsResponse = {
  movieId: string;
  cityId: string;
  functions: MovieFunctionItem[];
  /** Valores distintos del resultado (tras filtros) para la UI. */
  facets: MovieFunctionsFacets;
};

/**
 * Desglose de precio de una función (`GET /functions/:id/prices`).
 *
 * RN-037: el precio depende de formato, sala y horario (ya embebidos
 * en `Showtime.price`). RN-038: promociones automáticas del catálogo
 * (HU-026); `discountTotal` / `finalPrice` usan el mejor descuento.
 */
export type FunctionPricesResponse = {
  functionId: string;
  movieId: string;
  startsAt: string;
  format: MovieFormat;
  language: string;
  audioType: AudioType;
  cinema: { id: string; name: string };
  room: { id: string; name: string; roomType: RoomType };
  /** Precio base de la función (COP). */
  basePrice: number;
  /** Factores que explican el precio (RN-037). */
  priceFactors: {
    format: MovieFormat;
    roomType: RoomType;
    startsAt: string;
  };
  /**
   * Promociones automáticas aplicables (RN-038 / HU-026).
   * Cupones con código se aplican en `POST /cart/apply-promo`.
   */
  promotions: Array<{
    code: string;
    description: string;
    discountAmount: number;
  }>;
  discountTotal: number;
  /** `basePrice - discountTotal` (mejor promo automática). */
  finalPrice: number;
  currency: 'COP';
  availableSeats: number;
  capacity: number;
  isSoldOut: boolean;
  isSelectable: boolean;
};
