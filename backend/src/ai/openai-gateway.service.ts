import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatIntent } from './enums/ai.enums';

/**
 * Turno de conversación enviado al proveedor de IA.
 */
export type AiChatTurn = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/**
 * Contexto de catálogo (resumen) para que el modelo no invente funciones.
 */
export type AiCatalogHint = {
  movieId: string;
  title: string;
  genres: string[];
  classification: string;
  durationMinutes: number;
  rating: number;
  availableShowtimeCount: number;
  formats: string[];
  roomTypes: string[];
  earliestStartsAt: string | null;
};

/**
 * Resultado estructurado del adaptador (stub o API real).
 */
export type AiGatewayResult = {
  intent: ChatIntent;
  /** Texto libre; el dominio puede enriquecerlo con datos reales. */
  draftReply: string;
  /** IDs de películas sugeridas (deben existir en el catálogo pasado). */
  suggestedMovieIds: string[];
  /** Hora mínima (0–23) si la intención es AFTER_HOUR. */
  afterHour?: number;
  /** Género detectado en lenguaje natural. */
  detectedGenre?: string;
  /** Pedir escalado a humano (RN-095). */
  escalate: boolean;
  provider: 'stub' | 'openai';
};

/**
 * Adaptador de IA generativa para el chatbot (HU-021).
 *
 * @remarks
 * **Patrón:** Adapter.
 * Problema que resuelve: aislar el proveedor de lenguaje natural
 * (stub local / OpenAI / Amazon Bedrock) del dominio Multicine, para
 * poder cambiar de motor sin tocar reglas RN-091…095 ni la persistencia.
 *
 * Por defecto usa un **stub determinista** (sin red) que detecta
 * intenciones por palabras clave y elige películas del catálogo real.
 * Si `OPENAI_API_KEY` está definida, registra la intención de usar
 * OpenAI pero mantiene el stub educativo (integración real = opcional).
 */
@Injectable()
export class OpenAiGatewayService {
  private readonly logger = new Logger(OpenAiGatewayService.name);

  /**
   * @param config - Lee `OPENAI_API_KEY` (opcional).
   */
  constructor(private readonly config: ConfigService) {}

  /**
   * Interpreta el mensaje del usuario contra el catálogo disponible.
   *
   * @param message - Texto del usuario.
   * @param catalog - Películas reales de la ciudad (nunca inventar fuera de esta lista).
   * @param history - Últimos turnos (contexto corto).
   * @returns Intención + borrador de respuesta + IDs sugeridos.
   */
  async complete(params: {
    message: string;
    catalog: AiCatalogHint[];
    history: AiChatTurn[];
  }): Promise<AiGatewayResult> {
    const provider = this.resolveProvider();
    if (provider === 'openai') {
      this.logger.debug(
        'OPENAI_API_KEY presente: stub educativo activo (sustituible por chat completions).',
      );
    }

    return this.stubComplete(params.message, params.catalog);
  }

  /**
   * Stub local: NLU por palabras clave + ranking simple del catálogo.
   *
   * @param message - Mensaje del usuario.
   * @param catalog - Catálogo filtrado por ciudad.
   * @returns Resultado estructurado.
   */
  private stubComplete(
    message: string,
    catalog: AiCatalogHint[],
  ): AiGatewayResult {
    const text = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

    if (this.wantsHuman(text)) {
      return {
        intent: ChatIntent.ESCALATE,
        draftReply:
          'Voy a escalar este chat a soporte humano. Un agente de Multicine te contactará pronto.',
        suggestedMovieIds: [],
        escalate: true,
        provider: 'stub',
      };
    }

    if (this.matchesAny(text, ['promoc', 'cupon', 'descuento', '2x1', 'black friday'])) {
      return {
        intent: ChatIntent.PROMOTIONS,
        draftReply: 'Estas son las promociones vigentes en Multicine.',
        suggestedMovieIds: [],
        escalate: false,
        provider: 'stub',
      };
    }

    if (this.matchesAny(text, ['membres', 'beneficio', 'socio', 'puntos'])) {
      return {
        intent: ChatIntent.MEMBERSHIP,
        draftReply: 'Puedo contarte sobre la membresía digital Multicine.',
        suggestedMovieIds: [],
        escalate: false,
        provider: 'stub',
      };
    }

    if (this.matchesAny(text, ['vip', 'sala vip'])) {
      const vipIds = catalog
        .filter((c) => c.roomTypes.includes('VIP') || c.formats.includes('VIP'))
        .map((c) => c.movieId);
      return {
        intent: ChatIntent.VIP,
        draftReply:
          vipIds.length > 0
            ? 'Estas películas tienen funciones en sala VIP en tu ciudad.'
            : 'No encontré funciones VIP disponibles ahora en esa ciudad.',
        suggestedMovieIds: vipIds.slice(0, 3),
        escalate: false,
        provider: 'stub',
      };
    }

    const afterHour = this.parseAfterHour(text);
    if (afterHour !== null) {
      return {
        intent: ChatIntent.AFTER_HOUR,
        draftReply: `Busco funciones después de las ${afterHour}:00.`,
        suggestedMovieIds: catalog.map((c) => c.movieId).slice(0, 5),
        afterHour,
        escalate: false,
        provider: 'stub',
      };
    }

    if (
      this.matchesAny(text, [
        'nino',
        'nina',
        'infantil',
        'animacion',
        'familia',
        'kids',
        'para ninos',
      ])
    ) {
      const kids = this.rankCatalog(catalog, {
        preferGenres: ['animación', 'animacion', 'familiar', 'comedia'],
        preferClassifications: ['T', '7+'],
      });
      return {
        intent: ChatIntent.KIDS,
        draftReply:
          kids.length > 0
            ? 'Estas opciones son aptas para ver en familia o con niños.'
            : 'No hay funciones infantiles disponibles ahora en esa ciudad.',
        suggestedMovieIds: kids.slice(0, 3).map((c) => c.movieId),
        detectedGenre: 'animación',
        escalate: false,
        provider: 'stub',
      };
    }

    if (this.matchesAny(text, ['hoy', 'esta noche', 'esta tarde', 'today'])) {
      const ranked = this.rankCatalog(catalog, {});
      return {
        intent: ChatIntent.TODAY,
        draftReply: 'Esto es lo que hay hoy (o con funciones próximas) en tu ciudad.',
        suggestedMovieIds: ranked.slice(0, 3).map((c) => c.movieId),
        escalate: false,
        provider: 'stub',
      };
    }

    if (this.matchesAny(text, ['hola', 'buenas', 'ayuda', 'que puedes', 'empezar'])) {
      return {
        intent: ChatIntent.GREETING,
        draftReply:
          '¡Hola! Soy el asistente de Multicine. Puedo recomendarte películas según género, edad, si vienes con niños, horarios, salas VIP o promociones. ¿Qué te apetece ver?',
        suggestedMovieIds: [],
        escalate: false,
        provider: 'stub',
      };
    }

    const genre = this.detectGenre(text);
    if (genre || catalog.length > 0) {
      const ranked = this.rankCatalog(catalog, {
        preferGenres: genre ? [genre] : undefined,
      });
      if (ranked.length === 0) {
        return {
          intent: ChatIntent.ESCALATE,
          draftReply:
            'No pude encontrar una recomendación clara con lo que me contaste. ¿Quieres que te conecte con soporte humano?',
          suggestedMovieIds: [],
          escalate: true,
          provider: 'stub',
        };
      }
      return {
        intent: ChatIntent.RECOMMEND,
        draftReply: genre
          ? `Según tu gusto por ${genre}, estas son mis mejores opciones en cartelera.`
          : 'Con base en la cartelera de tu ciudad, estas son mis recomendaciones.',
        suggestedMovieIds: ranked.slice(0, 3).map((c) => c.movieId),
        detectedGenre: genre,
        escalate: false,
        provider: 'stub',
      };
    }

    return {
      intent: ChatIntent.ESCALATE,
      draftReply:
        'No estoy seguro de cómo ayudarte con eso. Puedo escalar la conversación a un agente humano.',
      suggestedMovieIds: [],
      escalate: true,
      provider: 'stub',
    };
  }

  /**
   * @returns `openai` si hay API key; si no `stub`.
   */
  private resolveProvider(): 'stub' | 'openai' {
    const key = this.config.get<string>('OPENAI_API_KEY');
    return key && key.trim().length > 0 ? 'openai' : 'stub';
  }

  /**
   * @param text - Mensaje normalizado.
   * @returns true si pide humano / no entiende.
   */
  private wantsHuman(text: string): boolean {
    return this.matchesAny(text, [
      'hablar con alguien',
      'soporte',
      'agente',
      'humano',
      'asesor',
      'call center',
      'atencion al cliente',
    ]);
  }

  /**
   * Extrae hora 0–23 de frases tipo “después de las 8”.
   *
   * @param text - Mensaje normalizado.
   * @returns Hora o null.
   */
  private parseAfterHour(text: string): number | null {
    if (!this.matchesAny(text, ['despues de', 'luego de', 'a partir de', 'despues de las'])) {
      // también aceptar “después de las 8 pm” vía regex aunque no matchee la lista corta
      if (!/despues|luego|a partir/.test(text)) {
        return null;
      }
    }
    const m = text.match(
      /(?:despues de(?: las)?|luego de(?: las)?|a partir de(?: las)?)\s*(\d{1,2})/,
    );
    if (!m) {
      return null;
    }
    let hour = Number(m[1]);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) {
      return null;
    }
    if (text.includes('pm') && hour < 12) {
      hour += 12;
    }
    return hour;
  }

  /**
   * @param text - Mensaje.
   * @returns Género canónico o undefined.
   */
  private detectGenre(text: string): string | undefined {
    const map: Array<{ keys: string[]; genre: string }> = [
      { keys: ['accion', 'action'], genre: 'acción' },
      { keys: ['comedia', 'risa', 'divertid'], genre: 'comedia' },
      { keys: ['terror', 'miedo', 'horror'], genre: 'terror' },
      { keys: ['drama'], genre: 'drama' },
      { keys: ['animacion', 'animada'], genre: 'animación' },
      { keys: ['ciencia ficcion', 'sci-fi', 'espacial'], genre: 'ciencia ficción' },
      { keys: ['romance', 'romantica', 'cita'], genre: 'romance' },
      { keys: ['aventura'], genre: 'aventura' },
    ];
    for (const entry of map) {
      if (this.matchesAny(text, entry.keys)) {
        return entry.genre;
      }
    }
    return undefined;
  }

  /**
   * Ordena el catálogo priorizando disponibilidad, rating y género.
   *
   * @param catalog - Lista de la ciudad.
   * @param opts - Preferencias blandas.
   * @returns Catálogo ordenado.
   */
  private rankCatalog(
    catalog: AiCatalogHint[],
    opts: {
      preferGenres?: string[];
      preferClassifications?: string[];
    },
  ): AiCatalogHint[] {
    const preferGenres = (opts.preferGenres ?? []).map((g) =>
      g.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''),
    );
    const preferClass = new Set(opts.preferClassifications ?? []);

    return [...catalog].sort((a, b) => {
      const score = (c: AiCatalogHint): number => {
        let s = 0;
        s += Math.min(c.availableShowtimeCount, 5) * 10;
        s += Number(c.rating) * 2;
        if (preferClass.size > 0 && preferClass.has(c.classification)) {
          s += 30;
        }
        const genres = c.genres.map((g) =>
          g.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''),
        );
        for (const pg of preferGenres) {
          if (genres.some((g) => g.includes(pg) || pg.includes(g))) {
            s += 40;
          }
        }
        return s;
      };
      return score(b) - score(a);
    });
  }

  /**
   * @param text - Texto.
   * @param needles - Subcadenas.
   * @returns true si alguna aparece.
   */
  private matchesAny(text: string, needles: string[]): boolean {
    return needles.some((n) => text.includes(n));
  }
}
