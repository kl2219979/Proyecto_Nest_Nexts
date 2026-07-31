import { AudioType, MovieFormat, RoomType } from '../../movies/enums/movie.enums';
import { ChatIntent } from '../enums/ai.enums';

/** Función embebida en una tarjeta de recomendación del chat. */
export type ChatRecommendationShowtime = {
  id: string;
  startsAt: string;
  format: MovieFormat;
  language: string;
  audioType: AudioType;
  price: number;
  isSoldOut: boolean;
  cinema: { id: string; name: string };
  room: { id: string; name: string; roomType: RoomType };
};

/**
 * Tarjeta de película recomendada (criterios de aceptación HU-021).
 * El frontend usa `buyPath` para el botón Comprar.
 */
export type ChatRecommendationCard = {
  movieId: string;
  title: string;
  posterUrl: string;
  trailerUrl: string | null;
  synopsis: string | null;
  rating: number;
  durationMinutes: number;
  classification: string;
  genres: string[];
  formats: MovieFormat[];
  /** Precio mínimo entre funciones futuras no agotadas. */
  priceFrom: number | null;
  showtimes: ChatRecommendationShowtime[];
  /** Ruta relativa sugerida: `/movies/:id?cityId=` */
  buyPath: string;
};

/** Mensaje en el historial. */
export type ChatHistoryMessage = {
  id: string;
  role: string;
  content: string;
  intent: string | null;
  recommendations: ChatRecommendationCard[] | null;
  createdAt: string;
};

/** Respuesta de `POST /ai/chat`. */
export type ChatResponse = {
  sessionId: string;
  reply: string;
  intent: ChatIntent;
  recommendations: ChatRecommendationCard[];
  /** RN-095 */
  escalated: boolean;
  /** Latencia del turno en ms (RN-094 objetivo &lt; 5000). */
  latencyMs: number;
  suggestedFollowUps: string[];
};

/** Respuesta de `POST /ai/history`. */
export type ChatHistoryResponse = {
  sessionId: string;
  cityId: string;
  escalated: boolean;
  messages: ChatHistoryMessage[];
};
