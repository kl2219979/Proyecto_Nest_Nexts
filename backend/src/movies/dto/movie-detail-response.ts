import {
  AudioType,
  MovieFormat,
  MovieStatus,
  RoomType,
} from '../enums/movie.enums';

/**
 * Tipos de respuesta del detalle de película (HU-004 / HU-005).
 */

/** Miembro del elenco en la ficha. */
export type MovieCastMember = {
  name: string;
  role: string | null;
};

/** Precio de entrada agregado por formato. */
export type FormatPrice = {
  format: MovieFormat;
  /** Precio representativo (mínimo entre funciones futuras de la ciudad). */
  price: number;
};

/** Función futura en el detalle (RN-014 / RN-015). */
export type MovieDetailShowtime = {
  id: string;
  startsAt: string;
  format: MovieFormat;
  language: string;
  audioType: AudioType;
  price: number;
  /** RN-015: el frontend marca visualmente las agotadas. */
  isSoldOut: boolean;
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

/** Respuesta de `GET /movies/:id`. */
export type MovieDetailResponse = {
  id: string;
  title: string;
  posterUrl: string;
  bannerUrl: string | null;
  /** URL YouTube; embed = responsabilidad del frontend (RN-016). */
  trailerUrl: string | null;
  synopsis: string | null;
  director: string;
  cast: MovieCastMember[];
  genres: string[];
  durationMinutes: number;
  classification: string;
  releaseDate: string | null;
  /** Estado de catálogo (HU-005): UPCOMING | NOW_SHOWING. */
  status: MovieStatus;
  rating: number;
  isPremiere: boolean;
  languages: string[];
  formats: MovieFormat[];
  pricesByFormat: FormatPrice[];
  cityId: string;
  showtimes: MovieDetailShowtime[];
};

/** Tarjeta ligera de recomendación similar. */
export type MovieRecommendation = {
  id: string;
  title: string;
  posterUrl: string;
  genres: string[];
  classification: string;
  durationMinutes: number;
  rating: number;
  isPremiere: boolean;
};

/** Respuesta de `GET /movies/:id/recommendations`. */
export type MovieRecommendationsResponse = {
  movieId: string;
  cityId: string;
  recommendations: MovieRecommendation[];
};
