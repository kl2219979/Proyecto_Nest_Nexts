import { RecommendationSignalSource } from '../enums/recommendations.enums';

/**
 * Tipos de respuesta del motor personalizado (HU-022).
 */

/** Una razón legible de por qué se recomendó la película. */
export type RecommendationReason = {
  source: RecommendationSignalSource;
  detail: string;
};

/** Tarjeta del feed personalizado. */
export type PersonalizedRecommendationItem = {
  movieId: string;
  title: string;
  posterUrl: string;
  genres: string[];
  classification: string;
  durationMinutes: number;
  rating: number;
  isPremiere: boolean;
  score: number;
  reasons: RecommendationReason[];
  /** Formatos con función futura en la ciudad. */
  formats: string[];
  /** Idiomas con función futura en la ciudad. */
  languages: string[];
  /** Complejos con función futura. */
  cinemas: Array<{ id: string; name: string }>;
  /** Próxima función sugerida (si hay). */
  nextShowtime: {
    id: string;
    startsAt: string;
    format: string;
    language: string;
    cinemaId: string;
    cinemaName: string;
  } | null;
};

/** Señales agregadas usadas en el cálculo. */
export type RecommendationSignalsSummary = {
  genres: string[];
  formats: string[];
  languages: string[];
  cinemaIds: string[];
  weekdays: number[];
  hourFrom: number | null;
  hourTo: number | null;
  visitCount: number;
  excludedRecentMovieIds: string[];
  usedPurchaseHistory: boolean;
  usedProfileSignals: boolean;
};

/** Preferencias efectivas del usuario. */
export type RecommendationPreferencesResponse = {
  allowPurchaseHistory: boolean;
  allowProfileSignals: boolean;
  recentlyViewedDays: number;
  favoriteGenres: string[];
  preferredFormats: string[];
  preferredLanguages: string[];
  preferredCinemaIds: string[];
  preferredWeekdays: number[];
  preferredHourFrom: number | null;
  preferredHourTo: number | null;
  updatedAt: string | null;
};

/** Respuesta de `GET /recommendations`. */
export type PersonalizedFeedResponse = {
  cityId: string;
  computedAt: string;
  fromCache: boolean;
  preferences: RecommendationPreferencesResponse;
  signals: RecommendationSignalsSummary;
  recommendations: PersonalizedRecommendationItem[];
};

/** Respuesta de `POST /recommendations/preferences`. */
export type UpsertPreferencesResponse = {
  preferences: RecommendationPreferencesResponse;
  /** true si se invalidó el snapshot diario para forzar recálculo. */
  feedInvalidated: boolean;
};
