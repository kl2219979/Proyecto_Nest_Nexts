import { MovieStatus } from '../enums/movie.enums';

/**
 * Fecha de estreno en un complejo concreto (RN-018).
 */
export type UpcomingCinemaRelease = {
  cinemaId: string;
  cinemaName: string;
  releaseDate: string;
};

/**
 * Tarjeta de “Próximamente” (HU-005).
 *
 * El contador regresivo se expone como `daysUntilRelease`
 * (días enteros hasta la fecha de estreno de la ciudad).
 */
export type UpcomingMovieCard = {
  id: string;
  title: string;
  posterUrl: string;
  trailerUrl: string | null;
  /** Sinopsis (el frontend puede acortarla en la tarjeta). */
  synopsis: string | null;
  genres: string[];
  classification: string;
  durationMinutes: number | null;
  /** Fecha de estreno resuelta para la ciudad (RN-018). */
  releaseDate: string;
  /** Días hasta el estreno (≥ 0). 0 = estrena hoy. */
  daysUntilRelease: number;
  status: MovieStatus;
  /** Variantes por complejo cuando existen (RN-018). */
  releasesByCinema: UpcomingCinemaRelease[];
};

/** Respuesta de `GET /movies/upcoming`. */
export type UpcomingMoviesResponse = {
  cityId: string;
  movies: UpcomingMovieCard[];
};
