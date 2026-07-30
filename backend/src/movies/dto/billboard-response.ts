import { AudioType, MovieFormat, RoomType } from '../enums/movie.enums';

/**
 * Tipos de respuesta de la cartelera (HU-003).
 * El frontend arma las tarjetas con estos campos.
 */

/** Función embebida en la tarjeta de película. */
export type BillboardShowtime = {
  id: string;
  startsAt: string;
  format: MovieFormat;
  language: string;
  audioType: AudioType;
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

/** Tarjeta de película en cartelera. */
export type BillboardMovie = {
  id: string;
  title: string;
  posterUrl: string;
  genres: string[];
  classification: string;
  durationMinutes: number;
  director: string;
  rating: number;
  isPremiere: boolean;
  /** Formatos distintos presentes en las funciones filtradas. */
  formats: MovieFormat[];
  /** Idiomas distintos presentes en las funciones filtradas. */
  languages: string[];
  /** Audio types distintos (subtitulada / doblada). */
  audioTypes: AudioType[];
  showtimes: BillboardShowtime[];
};

/** Envelope de `GET /movies` y `GET /movies/today`. */
export type BillboardResponse = {
  cityId: string;
  /** Inicio de la ventana (ISO date YYYY-MM-DD, zona local del servidor). */
  from: string;
  /** Fin inclusivo de la ventana (siempre from+6 días, RN-012). */
  to: string;
  /** Si no hay películas, el frontend muestra el mensaje informativo (RN-007). */
  movies: BillboardMovie[];
};
