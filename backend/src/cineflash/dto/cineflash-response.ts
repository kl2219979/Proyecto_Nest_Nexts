import { MovieFormat } from '../../movies/enums/movie.enums';

/**
 * Función con Cine Flash activo (`GET /movies/cineflash`).
 */
export type CineFlashFunctionItem = {
  functionId: string;
  movieId: string;
  movieTitle: string;
  bannerUrl: string | null;
  posterUrl: string | null;
  startsAt: string;
  format: MovieFormat;
  language: string;
  cinemaId: string;
  cinemaName: string;
  cityId: string;
  roomId: string;
  roomName: string;
  capacity: number;
  soldSeats: number;
  availableSeats: number;
  occupancyPercent: number;
  basePrice: number;
  flashPrice: number;
  discountPercent: number;
  maxTickets: number;
  promotionId: string;
  promoCode: string | null;
  badge: 'CINE_FLASH';
  tagline: string;
};

/**
 * Envelope de listado Cine Flash.
 */
export type CineFlashListResponse = {
  cityId: string | null;
  count: number;
  items: CineFlashFunctionItem[];
};

/**
 * Resumen de una pasada del procesador.
 */
export type CineFlashProcessResult = {
  evaluated: number;
  activated: number;
  deactivated: number;
  emailsQueued: number;
  pushStubbed: number;
  activatedShowtimeIds: string[];
  deactivatedShowtimeIds: string[];
};
