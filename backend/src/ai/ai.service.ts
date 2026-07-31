import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { benefitsForLevel } from '../membership/membership-benefits';
import { MembershipService } from '../membership/membership.service';
import { BillboardMovie } from '../movies/dto/billboard-response';
import { MovieDetailResponse } from '../movies/dto/movie-detail-response';
import { AudioType } from '../movies/enums/movie.enums';
import { MoviesService } from '../movies/movies.service';
import { PromotionsService } from '../promotions/promotions.service';
import {
  AI_BUY_PATH_PREFIX,
  AI_HISTORY_CONTEXT_LIMIT,
  AI_MAX_LATENCY_MS,
  AI_MAX_RECOMMENDATIONS,
  AI_SYNOPSIS_MAX_CHARS,
  CLASSIFICATION_MIN_AGE,
} from './ai.constants';
import {
  ChatHistoryResponse,
  ChatRecommendationCard,
  ChatResponse,
} from './dto/ai-response';
import { ChatPreferencesDto, ChatRequestDto } from './dto/ai.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { ChatIntent, ChatMessageRole } from './enums/ai.enums';
import {
  AiCatalogHint,
  AiChatTurn,
  OpenAiGatewayService,
} from './openai-gateway.service';

/**
 * Orquestador del chatbot de recomendaciones (HU-021).
 *
 * Flujo por turno:
 * 1. Crear/continuar sesión + persistir mensaje USER.
 * 2. Cargar cartelera real de la ciudad (RN-091) y filtrar por edad (RN-093).
 * 3. Priorizar funciones con cupo (RN-092).
 * 4. Invocar adaptador de IA (no inventa IDs fuera del catálogo).
 * 5. Enriquecer tarjetas (poster, trailer, sinopsis, horarios, precio).
 * 6. Escalar a humano si aplica (RN-095); medir latencia (RN-094).
 *
 * @remarks
 * **Patrón:** Service (Nest) + Adapter (`OpenAiGatewayService`).
 * Problema que resuelve: mantener las reglas de negocio Multicine en el
 * dominio y delegar solo el “entendimiento” del lenguaje al proveedor.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * @param sessionRepo - Sesiones de chat.
   * @param messageRepo - Mensajes.
   * @param moviesService - Cartelera / detalle (HU-003/004).
   * @param promotionsService - Promos vigentes (HU-026).
   * @param membershipService - Membresía del JWT (HU-008).
   * @param gateway - Adaptador OpenAI / stub.
   */
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    private readonly moviesService: MoviesService,
    private readonly promotionsService: PromotionsService,
    private readonly membershipService: MembershipService,
    private readonly gateway: OpenAiGatewayService,
  ) {}

  /**
   * Procesa un turno de conversación (`POST /ai/chat`).
   *
   * @param dto - Mensaje + ciudad + prefs.
   * @param userId - UUID del JWT o null (visitante).
   * @returns Respuesta con recomendaciones reales.
   */
  async chat(
    dto: ChatRequestDto,
    userId: string | null,
  ): Promise<ChatResponse> {
    const started = Date.now();

    const session = await this.resolveSession(dto, userId);
    await this.persistMessage({
      sessionId: session.id,
      role: ChatMessageRole.USER,
      content: dto.message.trim(),
      intent: null,
      recommendations: null,
    });

    const billboard = await this.moviesService.getWeeklyBillboard({
      cityId: dto.cityId,
      available: true,
    });
    const age = session.age;
    const filteredMovies = this.filterByAge(billboard.movies, age);
    const catalog = this.toCatalogHints(filteredMovies);

    const history = await this.loadHistoryTurns(session.id);
    const ai = await this.gateway.complete({
      message: dto.message,
      catalog,
      history,
    });

    let recommendations: ChatRecommendationCard[] = [];
    let reply = ai.draftReply;
    let escalated = ai.escalate || session.escalated;

    switch (ai.intent) {
      case ChatIntent.PROMOTIONS:
        reply = await this.buildPromotionsReply();
        break;
      case ChatIntent.MEMBERSHIP:
        reply = await this.buildMembershipReply(userId);
        break;
      case ChatIntent.GREETING:
        reply = ai.draftReply;
        break;
      case ChatIntent.ESCALATE:
        escalated = true;
        session.escalated = true;
        await this.sessionRepo.save(session);
        reply = ai.draftReply;
        break;
      default: {
        const movieIds = this.pickMovieIds(
          ai.suggestedMovieIds,
          filteredMovies,
          ai,
          dto.preferences ?? session.preferences,
        );
        recommendations = await this.buildRecommendationCards(
          movieIds,
          dto.cityId,
          ai.afterHour,
        );
        reply = this.enrichReply(ai.draftReply, recommendations, ai.intent);
        if (recommendations.length === 0) {
          reply +=
            ' Si prefieres, puedo escalar la conversación a un agente humano.';
        }
        break;
      }
    }

    const latencyMs = Date.now() - started;
    if (latencyMs > AI_MAX_LATENCY_MS) {
      this.logger.warn(
        `Chat latency ${latencyMs}ms exceeds RN-094 budget (${AI_MAX_LATENCY_MS}ms)`,
      );
    }

    await this.persistMessage({
      sessionId: session.id,
      role: ChatMessageRole.ASSISTANT,
      content: reply,
      intent: ai.intent,
      recommendations,
    });

    return {
      sessionId: session.id,
      reply,
      intent: ai.intent,
      recommendations,
      escalated,
      latencyMs,
      suggestedFollowUps: this.followUps(ai.intent),
    };
  }

  /**
   * Devuelve el historial de una sesión (`POST /ai/history`).
   *
   * @param sessionId - UUID de sesión.
   * @param userId - JWT opcional (si la sesión tiene dueño, debe coincidir).
   * @returns Mensajes ordenados cronológicamente.
   */
  async getHistory(
    sessionId: string,
    userId: string | null,
  ): Promise<ChatHistoryResponse> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Sesión de chat no encontrada: ${sessionId}`);
    }
    if (session.userId && userId && session.userId !== userId) {
      throw new ForbiddenException('No puedes ver el historial de otra sesión');
    }
    if (session.userId && !userId) {
      throw new ForbiddenException(
        'Esta sesión pertenece a un usuario autenticado',
      );
    }

    const messages = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    return {
      sessionId: session.id,
      cityId: session.cityId,
      escalated: session.escalated,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        intent: m.intent,
        recommendations: (m.recommendations as ChatRecommendationCard[] | null) ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Crea o reutiliza sesión; actualiza ciudad/edad/prefs.
   *
   * @param dto - Request del turno.
   * @param userId - JWT o null.
   * @returns Sesión persistida.
   */
  private async resolveSession(
    dto: ChatRequestDto,
    userId: string | null,
  ): Promise<ChatSession> {
    if (dto.sessionId) {
      const existing = await this.sessionRepo.findOne({
        where: { id: dto.sessionId },
      });
      if (!existing) {
        throw new NotFoundException(
          `Sesión de chat no encontrada: ${dto.sessionId}`,
        );
      }
      if (existing.userId && userId && existing.userId !== userId) {
        throw new ForbiddenException('Sesión de otro usuario');
      }
      existing.cityId = dto.cityId;
      if (dto.age !== undefined) {
        existing.age = dto.age;
      }
      if (dto.preferences) {
        existing.preferences = {
          ...(existing.preferences ?? {}),
          ...dto.preferences,
        };
      }
      if (!existing.userId && userId) {
        existing.userId = userId;
      }
      return this.sessionRepo.save(existing);
    }

    const created = this.sessionRepo.create({
      userId,
      cityId: dto.cityId,
      age: dto.age ?? null,
      preferences: dto.preferences
        ? ({ ...dto.preferences } as Record<string, unknown>)
        : null,
      escalated: false,
    });
    return this.sessionRepo.save(created);
  }

  /**
   * Persiste un mensaje de la conversación.
   */
  private async persistMessage(input: {
    sessionId: string;
    role: ChatMessageRole;
    content: string;
    intent: string | null;
    recommendations: ChatRecommendationCard[] | null;
  }): Promise<ChatMessage> {
    const row = this.messageRepo.create({
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      intent: input.intent,
      recommendations: input.recommendations,
    });
    return this.messageRepo.save(row);
  }

  /**
   * Carga turnos recientes para el adaptador.
   */
  private async loadHistoryTurns(sessionId: string): Promise<AiChatTurn[]> {
    const rows = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: AI_HISTORY_CONTEXT_LIMIT,
    });
    return rows
      .reverse()
      .filter((m) => m.role !== ChatMessageRole.SYSTEM)
      .map((m) => ({
        role:
          m.role === ChatMessageRole.USER
            ? ('user' as const)
            : ('assistant' as const),
        content: m.content,
      }));
  }

  /**
   * RN-093: excluye películas cuya clasificación exige más edad.
   *
   * @param movies - Cartelera de la ciudad.
   * @param age - Edad declarada o null (sin filtro).
   * @returns Películas permitidas.
   */
  filterByAge(movies: BillboardMovie[], age: number | null): BillboardMovie[] {
    if (age === null || age === undefined) {
      return movies;
    }
    return movies.filter((m) => {
      const min = this.minAgeForClassification(m.classification);
      return min <= age;
    });
  }

  /**
   * @param classification - Etiqueta etaria (T, 12+, …).
   * @returns Edad mínima requerida.
   */
  minAgeForClassification(classification: string): number {
    return CLASSIFICATION_MIN_AGE[classification] ?? 18;
  }

  /**
   * Convierte cartelera a hints compactos para el adaptador.
   */
  private toCatalogHints(movies: BillboardMovie[]): AiCatalogHint[] {
    return movies.map((m) => {
      const available = m.showtimes.filter((s) => !s.isSoldOut);
      const roomTypes = [
        ...new Set(available.map((s) => s.room.roomType)),
      ] as string[];
      const earliest = available
        .map((s) => s.startsAt)
        .sort()[0] ?? null;
      return {
        movieId: m.id,
        title: m.title,
        genres: m.genres,
        classification: m.classification,
        durationMinutes: m.durationMinutes,
        rating: Number(m.rating),
        availableShowtimeCount: available.length,
        formats: m.formats as string[],
        roomTypes,
        earliestStartsAt: earliest,
      };
    });
  }

  /**
   * Elige IDs finales aplicando preferencias de sesión/turno.
   */
  private pickMovieIds(
    suggested: string[],
    movies: BillboardMovie[],
    ai: { afterHour?: number; detectedGenre?: string; intent: ChatIntent },
    preferences: ChatPreferencesDto | Record<string, unknown> | null | undefined,
  ): string[] {
    const byId = new Map(movies.map((m) => [m.id, m]));
    let pool = suggested
      .map((id) => byId.get(id))
      .filter((m): m is BillboardMovie => Boolean(m));

    if (pool.length === 0) {
      pool = [...movies];
    }

    const prefs = preferences ?? {};
    const withKids =
      prefs['withKids'] === true ||
      (prefs['companionType'] as string | undefined) === 'family';
    const genre =
      (prefs['genre'] as string | undefined) ?? ai.detectedGenre ?? undefined;
    const durationPref = prefs['durationPreference'] as string | undefined;
    const audioType = prefs['audioType'] as string | undefined;

    if (withKids || ai.intent === ChatIntent.KIDS) {
      pool = pool.filter(
        (m) =>
          this.minAgeForClassification(m.classification) <= 12 ||
          m.genres.some((g) =>
            /animaci[oó]n|familiar/i.test(g),
          ),
      );
    }

    if (genre) {
      const gNorm = this.normalize(genre);
      const matched = pool.filter((m) =>
        m.genres.some((g) => this.normalize(g).includes(gNorm) || gNorm.includes(this.normalize(g))),
      );
      if (matched.length > 0) {
        pool = matched;
      }
    }

    if (durationPref === 'short') {
      pool = pool.filter((m) => m.durationMinutes < 100);
    } else if (durationPref === 'long') {
      pool = pool.filter((m) => m.durationMinutes >= 100);
    }

    if (audioType === AudioType.DUBBED || audioType === AudioType.SUBTITLED) {
      const matched = pool.filter((m) =>
        m.showtimes.some(
          (s) => !s.isSoldOut && s.audioType === audioType,
        ),
      );
      if (matched.length > 0) {
        pool = matched;
      }
    }

    // RN-092: priorizar las que tienen al menos una función no agotada
    pool.sort((a, b) => {
      const aAvail = a.showtimes.some((s) => !s.isSoldOut) ? 0 : 1;
      const bAvail = b.showtimes.some((s) => !s.isSoldOut) ? 0 : 1;
      if (aAvail !== bAvail) {
        return aAvail - bAvail;
      }
      return Number(b.rating) - Number(a.rating);
    });

    return pool.slice(0, AI_MAX_RECOMMENDATIONS).map((m) => m.id);
  }

  /**
   * Construye tarjetas enriquecidas vía detalle de película.
   */
  private async buildRecommendationCards(
    movieIds: string[],
    cityId: string,
    afterHour?: number,
  ): Promise<ChatRecommendationCard[]> {
    const cards: ChatRecommendationCard[] = [];
    for (const movieId of movieIds) {
      let detail: MovieDetailResponse;
      try {
        detail = await this.moviesService.getMovieDetail(movieId, { cityId });
      } catch {
        continue;
      }

      let showtimes = detail.showtimes.filter((s) => !s.isSoldOut);
      if (afterHour !== undefined) {
        showtimes = showtimes.filter((s) => {
          const hour = new Date(s.startsAt).getHours();
          return hour >= afterHour;
        });
      }

      // RN-092: si todas agotadas tras filtro, no recomendar
      if (showtimes.length === 0) {
        continue;
      }

      const prices = showtimes.map((s) => s.price);
      const priceFrom = prices.length > 0 ? Math.min(...prices) : null;

      cards.push({
        movieId: detail.id,
        title: detail.title,
        posterUrl: detail.posterUrl,
        trailerUrl: detail.trailerUrl,
        synopsis: this.truncateSynopsis(detail.synopsis),
        rating: Number(detail.rating),
        durationMinutes: detail.durationMinutes,
        classification: detail.classification,
        genres: detail.genres,
        formats: detail.formats,
        priceFrom,
        showtimes: showtimes.slice(0, 8).map((s) => ({
          id: s.id,
          startsAt: s.startsAt,
          format: s.format,
          language: s.language,
          audioType: s.audioType,
          price: s.price,
          isSoldOut: s.isSoldOut,
          cinema: s.cinema,
          room: s.room,
        })),
        buyPath: `${AI_BUY_PATH_PREFIX}/${detail.id}?cityId=${cityId}`,
      });
    }
    return cards;
  }

  /**
   * Texto de promociones vigentes (FAQ).
   */
  private async buildPromotionsReply(): Promise<string> {
    const promos = await this.promotionsService.listActivePublic();
    if (promos.length === 0) {
      return 'Ahora mismo no hay promociones vigentes. Vuelve a consultar pronto.';
    }
    const lines = promos.slice(0, 8).map((p) => {
      const code = p.code ? ` (código ${p.code})` : '';
      return `• ${p.name}${code}: ${p.description ?? p.type}`;
    });
    return `Promociones activas:\n${lines.join('\n')}`;
  }

  /**
   * Texto de membresía (API Membresías del backlog).
   */
  private async buildMembershipReply(userId: string | null): Promise<string> {
    if (!userId) {
      return (
        'La membresía digital Multicine se crea al registrarte: código único, ' +
        'beneficios por nivel (Bronce→Platino) y billetera. Inicia sesión para ver tu nivel y QR de socio.'
      );
    }
    try {
      const detail = await this.membershipService.getDetailForUser(userId);
      const benefits = benefitsForLevel(detail.level)
        .slice(0, 4)
        .map((b) => b.description)
        .join('; ');
      return (
        `Tu membresía ${detail.code} está en nivel ${detail.level}. ` +
        `Beneficios destacados: ${benefits || 'consulta GET /membership'}.`
      );
    } catch {
      return 'No encontré una membresía asociada a tu cuenta. Completa el registro/activación.';
    }
  }

  /**
   * Añade títulos concretos al borrador del adaptador.
   */
  private enrichReply(
    draft: string,
    cards: ChatRecommendationCard[],
    intent: ChatIntent,
  ): string {
    if (cards.length === 0) {
      if (intent === ChatIntent.VIP) {
        return 'No hay salas VIP con cupo disponible en este momento para tu ciudad.';
      }
      if (intent === ChatIntent.AFTER_HOUR) {
        return 'No encontré funciones con cupo después de esa hora en tu ciudad.';
      }
      if (intent === ChatIntent.KIDS) {
        return 'No hay películas aptas para niños con funciones disponibles ahora.';
      }
      return `${draft} No hay coincidencias con cupo en la cartelera de tu ciudad.`;
    }
    const titles = cards.map((c) => `«${c.title}»`).join(', ');
    return `${draft} Te sugiero: ${titles}. Cada tarjeta incluye poster, trailer, horarios y precio para comprar.`;
  }

  /**
   * Preguntas de seguimiento sugeridas al frontend.
   */
  private followUps(intent: ChatIntent): string[] {
    switch (intent) {
      case ChatIntent.GREETING:
        return [
          '¿Qué películas hay hoy?',
          '¿Hay algo para niños?',
          '¿Qué promociones existen?',
        ];
      case ChatIntent.PROMOTIONS:
        return ['Recomiéndame una comedia', '¿Hay salas VIP?'];
      case ChatIntent.ESCALATE:
        return ['Recomiéndame una película', '¿Qué hay hoy?'];
      default:
        return [
          '¿Funciones después de las 8 pm?',
          '¿Qué promociones existen?',
          'Quiero hablar con un humano',
        ];
    }
  }

  private truncateSynopsis(synopsis: string | null): string | null {
    if (!synopsis) {
      return null;
    }
    if (synopsis.length <= AI_SYNOPSIS_MAX_CHARS) {
      return synopsis;
    }
    return `${synopsis.slice(0, AI_SYNOPSIS_MAX_CHARS - 1)}…`;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
  }
}
