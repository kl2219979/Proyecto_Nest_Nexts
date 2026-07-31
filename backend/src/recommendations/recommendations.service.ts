import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { MovieStatus } from '../movies/enums/movie.enums';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import {
  PersonalizedFeedResponse,
  PersonalizedRecommendationItem,
  RecommendationPreferencesResponse,
  RecommendationReason,
  RecommendationSignalsSummary,
  UpsertPreferencesResponse,
} from './dto/recommendations-response';
import { UpsertRecommendationPreferencesDto } from './dto/recommendations.dto';
import { RecommendationFeed } from './entities/recommendation-feed.entity';
import { RecommendationPreference } from './entities/recommendation-preference.entity';
import { RecommendationSignalSource } from './enums/recommendations.enums';
import {
  DEFAULT_RECENTLY_VIEWED_DAYS,
  HISTORY_ORDERS_LIMIT,
  RECOMMENDATIONS_FEED_LIMIT,
  WEIGHT_CINEMA,
  WEIGHT_EXPLICIT_GENRE,
  WEIGHT_FORMAT,
  WEIGHT_HISTORY_GENRE,
  WEIGHT_HOUR,
  WEIGHT_LANGUAGE,
  WEIGHT_RATING,
  WEIGHT_WEEKDAY,
} from './recommendations.constants';

/**
 * Perfil de gustos interno usado al rankear candidatos.
 */
type TasteProfile = {
  genreWeights: Map<string, number>;
  formats: Set<string>;
  languages: Set<string>;
  cinemaIds: Set<string>;
  weekdays: Set<number>;
  hourFrom: number | null;
  hourTo: number | null;
  visitCount: number;
  excludedMovieIds: Set<string>;
  usedPurchaseHistory: boolean;
  usedProfileSignals: boolean;
};

/**
 * Candidato con funciones futuras en la ciudad.
 */
type CandidateMovie = {
  movie: Movie;
  showtimes: Array<{
    id: string;
    startsAt: Date;
    format: string;
    language: string;
    cinemaId: string;
    cinemaName: string;
  }>;
};

/**
 * Motor de recomendaciones personalizadas (HU-022).
 *
 * Analiza historial autorizado + preferencias explícitas y rankea
 * películas en cartelera de la ciudad. Persiste un snapshot diario (RN-096).
 *
 * @remarks
 * **Patrón:** Scoring Pipeline (signals → weights → rank → cache).
 * Problema que resuelve: combinar historial, prefs y exclusión reciente
 * sin acoplar el ranking al chatbot (HU-021) ni a recomendaciones por
 * género de ficha (HU-004).
 */
@Injectable()
export class RecommendationsService {
  /**
   * @param preferenceRepo - Preferencias / consentimiento (RN-097/098).
   * @param feedRepo - Snapshots diarios (RN-096).
   * @param orderRepo - Historial de compras PAID.
   * @param movieRepo - Catálogo y géneros.
   * @param showtimeRepo - Funciones futuras por ciudad.
   * @param cityRepo - Validación de ciudad.
   * @param profileRepo - Cine favorito opcional.
   * @param config - Default de días “ya vistas”.
   */
  constructor(
    @InjectRepository(RecommendationPreference)
    private readonly preferenceRepo: Repository<RecommendationPreference>,
    @InjectRepository(RecommendationFeed)
    private readonly feedRepo: Repository<RecommendationFeed>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Devuelve el feed personalizado (cache del día o recálculo).
   *
   * @param userId - JWT.
   * @param cityId - Ciudad de cartelera.
   */
  async getFeed(
    userId: string,
    cityId: string,
  ): Promise<PersonalizedFeedResponse> {
    await this.assertCityExists(cityId);

    const preferences = await this.getOrCreatePreferences(userId);
    const cached = await this.feedRepo.findOne({
      where: { userId, cityId },
    });

    if (cached && this.isFreshToday(cached.computedAt)) {
      return this.toFeedResponse(cityId, preferences, cached, true);
    }

    const computed = await this.computeAndPersist(userId, cityId, preferences);
    return this.toFeedResponse(cityId, preferences, computed, false);
  }

  /**
   * Upsert de preferencias e invalida snapshots del usuario (RN-096/097/098).
   *
   * @param userId - JWT.
   * @param dto - Campos a actualizar.
   */
  async upsertPreferences(
    userId: string,
    dto: UpsertRecommendationPreferencesDto,
  ): Promise<UpsertPreferencesResponse> {
    const prefs = await this.getOrCreatePreferences(userId);

    if (dto.allowPurchaseHistory !== undefined) {
      prefs.allowPurchaseHistory = dto.allowPurchaseHistory;
    }
    if (dto.allowProfileSignals !== undefined) {
      prefs.allowProfileSignals = dto.allowProfileSignals;
    }
    if (dto.recentlyViewedDays !== undefined) {
      prefs.recentlyViewedDays = dto.recentlyViewedDays;
    }
    if (dto.favoriteGenres !== undefined) {
      prefs.favoriteGenres = this.normalizeStrings(dto.favoriteGenres);
    }
    if (dto.preferredFormats !== undefined) {
      prefs.preferredFormats = this.normalizeStrings(dto.preferredFormats);
    }
    if (dto.preferredLanguages !== undefined) {
      prefs.preferredLanguages = this.normalizeStrings(
        dto.preferredLanguages,
      ).map((l) => l.toUpperCase());
    }
    if (dto.preferredCinemaIds !== undefined) {
      prefs.preferredCinemaIds = [...new Set(dto.preferredCinemaIds)];
    }
    if (dto.preferredWeekdays !== undefined) {
      prefs.preferredWeekdays = [...new Set(dto.preferredWeekdays)].sort(
        (a, b) => a - b,
      );
    }
    if (dto.preferredHourFrom !== undefined) {
      prefs.preferredHourFrom = dto.preferredHourFrom;
    }
    if (dto.preferredHourTo !== undefined) {
      prefs.preferredHourTo = dto.preferredHourTo;
    }

    await this.preferenceRepo.save(prefs);

    const deleted = await this.feedRepo.delete({ userId });
    const feedInvalidated = (deleted.affected ?? 0) > 0;

    return {
      preferences: this.toPreferencesResponse(prefs),
      feedInvalidated,
    };
  }

  /**
   * Recalcula todos los feeds existentes (cron RN-096).
   *
   * @returns Cantidad de feeds refrescados.
   */
  async refreshAllFeeds(): Promise<number> {
    const feeds = await this.feedRepo.find();
    let refreshed = 0;

    for (const feed of feeds) {
      const prefs = await this.getOrCreatePreferences(feed.userId);
      await this.computeAndPersist(feed.userId, feed.cityId, prefs);
      refreshed += 1;
    }

    return refreshed;
  }

  /**
   * Calcula ranking y persiste snapshot.
   */
  private async computeAndPersist(
    userId: string,
    cityId: string,
    preferences: RecommendationPreference,
  ): Promise<RecommendationFeed> {
    const taste = await this.buildTasteProfile(userId, preferences);
    const candidates = await this.loadCandidates(cityId);
    const ranked = this.rankCandidates(candidates, taste).slice(
      0,
      RECOMMENDATIONS_FEED_LIMIT,
    );

    const signals = this.toSignalsSummary(taste);
    const items = ranked;

    let feed = await this.feedRepo.findOne({ where: { userId, cityId } });
    if (!feed) {
      feed = this.feedRepo.create({ userId, cityId });
    }
    feed.items = items;
    feed.signals = signals as unknown as Record<string, unknown>;
    feed.computedAt = new Date();

    return this.feedRepo.save(feed);
  }

  /**
   * Construye pesos de gusto respetando consentimiento (RN-097)
   * y exclusión de vistas recientes (RN-098).
   */
  private async buildTasteProfile(
    userId: string,
    preferences: RecommendationPreference,
  ): Promise<TasteProfile> {
    const genreWeights = new Map<string, number>();
    const formats = new Set<string>();
    const languages = new Set<string>();
    const cinemaIds = new Set<string>();
    const weekdays = new Set<number>();
    let hourFrom = preferences.preferredHourFrom;
    let hourTo = preferences.preferredHourTo;
    let visitCount = 0;
    const excludedMovieIds = new Set<string>();
    let usedPurchaseHistory = false;
    let usedProfileSignals = false;

    for (const g of preferences.favoriteGenres ?? []) {
      const key = this.normalizeKey(g);
      genreWeights.set(
        key,
        (genreWeights.get(key) ?? 0) + WEIGHT_EXPLICIT_GENRE,
      );
    }
    for (const f of preferences.preferredFormats ?? []) {
      formats.add(this.normalizeKey(f));
    }
    for (const l of preferences.preferredLanguages ?? []) {
      languages.add(l.toUpperCase());
    }
    for (const c of preferences.preferredCinemaIds ?? []) {
      cinemaIds.add(c);
    }
    for (const d of preferences.preferredWeekdays ?? []) {
      weekdays.add(d);
    }

    if (preferences.allowProfileSignals) {
      const profile = await this.profileRepo.findOne({ where: { userId } });
      if (profile?.favoriteCinemaId) {
        cinemaIds.add(profile.favoriteCinemaId);
        usedProfileSignals = true;
      }
    }

    const recentlyViewedDays =
      preferences.recentlyViewedDays ??
      this.config.get<number>(
        'RECOMMENDATIONS_RECENTLY_VIEWED_DAYS',
        DEFAULT_RECENTLY_VIEWED_DAYS,
      );
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - recentlyViewedDays);

    if (preferences.allowPurchaseHistory) {
      const orders = await this.orderRepo.find({
        where: { userId, status: OrderStatus.PAID },
        relations: { tickets: true },
        order: { createdAt: 'DESC' },
        take: HISTORY_ORDERS_LIMIT,
      });

      usedPurchaseHistory = orders.length > 0;
      visitCount = orders.length;

      const historyMovieIds = new Set<string>();
      const formatCounts = new Map<string, number>();
      const languageCounts = new Map<string, number>();
      const cinemaCounts = new Map<string, number>();
      const weekdayCounts = new Map<number, number>();
      const hourCounts = new Map<number, number>();

      for (const order of orders) {
        const lines = order.tickets ?? [];
        for (const line of lines) {
          historyMovieIds.add(line.movieId);

          if (line.startsAt >= cutoff) {
            excludedMovieIds.add(line.movieId);
          }

          const fmt = this.normalizeKey(line.format);
          formatCounts.set(fmt, (formatCounts.get(fmt) ?? 0) + 1);
          const lang = line.language.toUpperCase();
          languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + 1);
          if (order.cinemaId) {
            cinemaCounts.set(
              order.cinemaId,
              (cinemaCounts.get(order.cinemaId) ?? 0) + 1,
            );
          }
          const day = line.startsAt.getDay();
          weekdayCounts.set(day, (weekdayCounts.get(day) ?? 0) + 1);
          const hour = line.startsAt.getHours();
          hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
        }
      }

      if (historyMovieIds.size > 0) {
        const movies = await this.movieRepo.find({
          where: { id: In([...historyMovieIds]) },
          relations: { genres: true },
        });
        for (const movie of movies) {
          for (const genre of movie.genres ?? []) {
            const key = this.normalizeKey(genre.name);
            genreWeights.set(
              key,
              (genreWeights.get(key) ?? 0) + WEIGHT_HISTORY_GENRE,
            );
          }
        }
      }

      this.addTopKeys(formatCounts, formats, 3);
      this.addTopKeys(languageCounts, languages, 3);
      this.addTopKeys(cinemaCounts, cinemaIds, 3);
      this.addTopNumericKeys(weekdayCounts, weekdays, 3);

      if (hourFrom == null && hourTo == null && hourCounts.size > 0) {
        const topHour = this.topKey(hourCounts);
        if (topHour != null) {
          hourFrom = Math.max(0, topHour - 1);
          hourTo = Math.min(23, topHour + 2);
        }
      }
    }

    return {
      genreWeights,
      formats,
      languages,
      cinemaIds,
      weekdays,
      hourFrom,
      hourTo,
      visitCount,
      excludedMovieIds,
      usedPurchaseHistory,
      usedProfileSignals,
    };
  }

  /**
   * Carga películas NOW_SHOWING con ≥1 función futura activa en la ciudad.
   */
  private async loadCandidates(cityId: string): Promise<CandidateMovie[]> {
    const now = new Date();
    const rows = await this.showtimeRepo
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.movie', 'movie')
      .leftJoinAndSelect('movie.genres', 'genre')
      .innerJoinAndSelect('st.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('st.isActive = :active', { active: true })
      .andWhere('st.startsAt > :now', { now })
      .andWhere('movie.isActive = :mActive', { mActive: true })
      .andWhere('movie.status = :status', { status: MovieStatus.NOW_SHOWING })
      .andWhere('cinema.cityId = :cityId', { cityId })
      .andWhere('cinema.isActive = :cActive', { cActive: true })
      .orderBy('st.startsAt', 'ASC')
      .getMany();

    const byMovie = new Map<string, CandidateMovie>();
    for (const st of rows) {
      const cinema = st.room.cinema;
      let entry = byMovie.get(st.movieId);
      if (!entry) {
        entry = { movie: st.movie, showtimes: [] };
        byMovie.set(st.movieId, entry);
      }
      entry.showtimes.push({
        id: st.id,
        startsAt: st.startsAt,
        format: st.format,
        language: st.language,
        cinemaId: cinema.id,
        cinemaName: cinema.name,
      });
    }

    return [...byMovie.values()];
  }

  /**
   * Rankea candidatos según el perfil de gustos.
   */
  private rankCandidates(
    candidates: CandidateMovie[],
    taste: TasteProfile,
  ): PersonalizedRecommendationItem[] {
    const scored: PersonalizedRecommendationItem[] = [];

    for (const candidate of candidates) {
      if (taste.excludedMovieIds.has(candidate.movie.id)) {
        continue;
      }

      const reasons: RecommendationReason[] = [];
      let score = 0;

      const movieGenres = (candidate.movie.genres ?? []).map((g) => g.name);
      for (const name of movieGenres) {
        const key = this.normalizeKey(name);
        const w = taste.genreWeights.get(key) ?? 0;
        if (w > 0) {
          score += w;
          const source =
            w >= WEIGHT_EXPLICIT_GENRE
              ? RecommendationSignalSource.EXPLICIT_PREFERENCE
              : RecommendationSignalSource.PURCHASE_HISTORY;
          reasons.push({
            source,
            detail: `Coincide con el género ${name}`,
          });
        }
      }

      const formats = new Set(
        candidate.showtimes.map((s) => this.normalizeKey(s.format)),
      );
      for (const f of formats) {
        if (taste.formats.has(f)) {
          score += WEIGHT_FORMAT;
          reasons.push({
            source: taste.usedPurchaseHistory
              ? RecommendationSignalSource.PURCHASE_HISTORY
              : RecommendationSignalSource.EXPLICIT_PREFERENCE,
            detail: `Formato preferido ${f.toUpperCase()}`,
          });
        }
      }

      const languages = new Set(
        candidate.showtimes.map((s) => s.language.toUpperCase()),
      );
      for (const l of languages) {
        if (taste.languages.has(l)) {
          score += WEIGHT_LANGUAGE;
          reasons.push({
            source: taste.usedPurchaseHistory
              ? RecommendationSignalSource.PURCHASE_HISTORY
              : RecommendationSignalSource.EXPLICIT_PREFERENCE,
            detail: `Idioma preferido ${l}`,
          });
        }
      }

      const cinemaHits = new Set<string>();
      for (const s of candidate.showtimes) {
        if (taste.cinemaIds.has(s.cinemaId) && !cinemaHits.has(s.cinemaId)) {
          cinemaHits.add(s.cinemaId);
          score += WEIGHT_CINEMA;
          reasons.push({
            source: taste.usedProfileSignals
              ? RecommendationSignalSource.PROFILE
              : RecommendationSignalSource.PURCHASE_HISTORY,
            detail: `Complejo preferido: ${s.cinemaName}`,
          });
        }
      }

      for (const s of candidate.showtimes) {
        const day = s.startsAt.getDay();
        if (taste.weekdays.has(day)) {
          score += WEIGHT_WEEKDAY;
          reasons.push({
            source: RecommendationSignalSource.PURCHASE_HISTORY,
            detail: `Función en tu día habitual (${day})`,
          });
          break;
        }
      }

      if (taste.hourFrom != null && taste.hourTo != null) {
        const match = candidate.showtimes.some((s) => {
          const h = s.startsAt.getHours();
          return h >= taste.hourFrom! && h <= taste.hourTo!;
        });
        if (match) {
          score += WEIGHT_HOUR;
          reasons.push({
            source: RecommendationSignalSource.PURCHASE_HISTORY,
            detail: `Horario en tu franja habitual (${taste.hourFrom}–${taste.hourTo}h)`,
          });
        }
      }

      const rating = Number(candidate.movie.rating);
      score += rating * WEIGHT_RATING;
      if (score < rating * WEIGHT_RATING + 0.01 && reasons.length === 0) {
        reasons.push({
          source: RecommendationSignalSource.POPULARITY,
          detail: `Destacada en cartelera (rating ${rating.toFixed(1)})`,
        });
      }

      const uniqueReasons = this.dedupeReasons(reasons);
      const next = candidate.showtimes[0] ?? null;
      const cinemaMap = new Map(
        candidate.showtimes.map((s) => [
          s.cinemaId,
          { id: s.cinemaId, name: s.cinemaName },
        ]),
      );

      scored.push({
        movieId: candidate.movie.id,
        title: candidate.movie.title,
        posterUrl: candidate.movie.posterUrl,
        genres: movieGenres.sort(),
        classification: candidate.movie.classification,
        durationMinutes: candidate.movie.durationMinutes,
        rating,
        isPremiere: candidate.movie.isPremiere,
        score: Math.round(score * 100) / 100,
        reasons: uniqueReasons,
        formats: [...formats].map((f) => f.toUpperCase()).sort(),
        languages: [...languages].sort(),
        cinemas: [...cinemaMap.values()].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        nextShowtime: next
          ? {
              id: next.id,
              startsAt: next.startsAt.toISOString(),
              format: next.format,
              language: next.language,
              cinemaId: next.cinemaId,
              cinemaName: next.cinemaName,
            }
          : null,
      });
    }

    return scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.rating - a.rating;
    });
  }

  private async getOrCreatePreferences(
    userId: string,
  ): Promise<RecommendationPreference> {
    let prefs = await this.preferenceRepo.findOne({ where: { userId } });
    if (prefs) return prefs;

    const defaultDays = this.config.get<number>(
      'RECOMMENDATIONS_RECENTLY_VIEWED_DAYS',
      DEFAULT_RECENTLY_VIEWED_DAYS,
    );

    prefs = this.preferenceRepo.create({
      userId,
      allowPurchaseHistory: true,
      allowProfileSignals: true,
      recentlyViewedDays: defaultDays,
      favoriteGenres: [],
      preferredFormats: [],
      preferredLanguages: [],
      preferredCinemaIds: [],
      preferredWeekdays: [],
      preferredHourFrom: null,
      preferredHourTo: null,
    });
    return this.preferenceRepo.save(prefs);
  }

  private async assertCityExists(cityId: string): Promise<void> {
    const city = await this.cityRepo.findOne({ where: { id: cityId } });
    if (!city) {
      throw new NotFoundException(`Ciudad no encontrada: ${cityId}`);
    }
  }

  /** RN-096: el snapshot es válido si es del mismo día UTC. */
  private isFreshToday(computedAt: Date): boolean {
    const now = new Date();
    return (
      computedAt.getUTCFullYear() === now.getUTCFullYear() &&
      computedAt.getUTCMonth() === now.getUTCMonth() &&
      computedAt.getUTCDate() === now.getUTCDate()
    );
  }

  private toFeedResponse(
    cityId: string,
    preferences: RecommendationPreference,
    feed: RecommendationFeed,
    fromCache: boolean,
  ): PersonalizedFeedResponse {
    return {
      cityId,
      computedAt: feed.computedAt.toISOString(),
      fromCache,
      preferences: this.toPreferencesResponse(preferences),
      signals: feed.signals as unknown as RecommendationSignalsSummary,
      recommendations: feed.items as PersonalizedRecommendationItem[],
    };
  }

  private toPreferencesResponse(
    prefs: RecommendationPreference,
  ): RecommendationPreferencesResponse {
    return {
      allowPurchaseHistory: prefs.allowPurchaseHistory,
      allowProfileSignals: prefs.allowProfileSignals,
      recentlyViewedDays: prefs.recentlyViewedDays,
      favoriteGenres: prefs.favoriteGenres ?? [],
      preferredFormats: prefs.preferredFormats ?? [],
      preferredLanguages: prefs.preferredLanguages ?? [],
      preferredCinemaIds: prefs.preferredCinemaIds ?? [],
      preferredWeekdays: prefs.preferredWeekdays ?? [],
      preferredHourFrom: prefs.preferredHourFrom,
      preferredHourTo: prefs.preferredHourTo,
      updatedAt: prefs.updatedAt ? prefs.updatedAt.toISOString() : null,
    };
  }

  private toSignalsSummary(taste: TasteProfile): RecommendationSignalsSummary {
    return {
      genres: [...taste.genreWeights.keys()].sort(),
      formats: [...taste.formats].map((f) => f.toUpperCase()).sort(),
      languages: [...taste.languages].sort(),
      cinemaIds: [...taste.cinemaIds].sort(),
      weekdays: [...taste.weekdays].sort((a, b) => a - b),
      hourFrom: taste.hourFrom,
      hourTo: taste.hourTo,
      visitCount: taste.visitCount,
      excludedRecentMovieIds: [...taste.excludedMovieIds].sort(),
      usedPurchaseHistory: taste.usedPurchaseHistory,
      usedProfileSignals: taste.usedProfileSignals,
    };
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeStrings(values: string[]): string[] {
    return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  }

  private addTopKeys(
    counts: Map<string, number>,
    target: Set<string>,
    limit: number,
  ): void {
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    for (const [key] of sorted) {
      target.add(key);
    }
  }

  private addTopNumericKeys(
    counts: Map<number, number>,
    target: Set<number>,
    limit: number,
  ): void {
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    for (const [key] of sorted) {
      target.add(key);
    }
  }

  private topKey(counts: Map<number, number>): number | null {
    let best: number | null = null;
    let bestCount = -1;
    for (const [key, count] of counts) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return best;
  }

  private dedupeReasons(
    reasons: RecommendationReason[],
  ): RecommendationReason[] {
    const seen = new Set<string>();
    const out: RecommendationReason[] = [];
    for (const r of reasons) {
      const key = `${r.source}:${r.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }
}
