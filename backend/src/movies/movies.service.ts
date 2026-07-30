import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../locations/entities/city.entity';
import { BillboardQueryDto } from './dto/billboard-query.dto';
import {
  BillboardMovie,
  BillboardResponse,
  BillboardShowtime,
} from './dto/billboard-response';
import { MovieDetailQueryDto } from './dto/movie-detail-query.dto';
import {
  FormatPrice,
  MovieDetailResponse,
  MovieDetailShowtime,
  MovieRecommendation,
  MovieRecommendationsResponse,
} from './dto/movie-detail-response';
import { Movie } from './entities/movie.entity';
import { Showtime } from './entities/showtime.entity';
import { AudioType, MovieFormat } from './enums/movie.enums';

/** Ventana fija de cartelera semanal (RN-012). */
const BILLBOARD_DAYS = 7;

/** Máximo de recomendaciones similares (HU-004). */
const MAX_RECOMMENDATIONS = 6;

/**
 * Lógica de negocio de cartelera (HU-003) y detalle de película (HU-004).
 *
 * Controller → Service → Repository:
 * arma listados semanales y la ficha completa con funciones futuras por ciudad.
 */
@Injectable()
export class MoviesService {
  /**
   * @param movieRepo - Acceso a `movies` (detalle y recomendaciones).
   * @param showtimeRepo - Acceso a `showtimes` (cartelera y funciones del detalle).
   * @param cityRepo - Valida que la ciudad exista antes de consultar.
   */
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
  ) {}

  /**
   * Cartelera de los próximos 7 días para una ciudad (RN-012).
   *
   * @param query - `cityId` + filtros opcionales del backlog.
   * @returns {Promise<BillboardResponse>} Películas activas con sus funciones.
   */
  async getWeeklyBillboard(query: BillboardQueryDto): Promise<BillboardResponse> {
    return this.buildBillboard(query, false);
  }

  /**
   * Cartelera del día actual en la ciudad (`GET /movies/today`).
   *
   * @param query - Mismos filtros que la semanal; `date` se fuerza a hoy.
   * @returns {Promise<BillboardResponse>} Películas con funciones de hoy.
   */
  async getTodayBillboard(query: BillboardQueryDto): Promise<BillboardResponse> {
    return this.buildBillboard(query, true);
  }

  /**
   * Ficha completa de una película para una ciudad (HU-004).
   *
   * Incluye sinopsis, elenco, tráiler URL, precios por formato y
   * solo funciones **futuras** de esa ciudad (RN-014), con `isSoldOut` (RN-015).
   *
   * @param movieId - UUID de la película.
   * @param query - Debe incluir `cityId`.
   * @returns {Promise<MovieDetailResponse>} Detalle listo para la UI.
   * @throws {NotFoundException} Película o ciudad inexistente / inactiva.
   */
  async getMovieDetail(
    movieId: string,
    query: MovieDetailQueryDto,
  ): Promise<MovieDetailResponse> {
    await this.assertCityExists(query.cityId);

    const movie = await this.movieRepo.findOne({
      where: { id: movieId, isActive: true },
      relations: { genres: true, castMembers: true },
      order: { castMembers: { sortOrder: 'ASC' } },
    });

    if (!movie) {
      throw new NotFoundException(`Película no encontrada: ${movieId}`);
    }

    const showtimes = await this.findFutureShowtimesForMovie(
      movieId,
      query.cityId,
    );

    const detailShowtimes = showtimes.map((s) => this.toDetailShowtime(s));
    const languages = [...new Set(detailShowtimes.map((s) => s.language))];
    const formats = [...new Set(detailShowtimes.map((s) => s.format))];

    return {
      id: movie.id,
      title: movie.title,
      posterUrl: movie.posterUrl,
      bannerUrl: movie.bannerUrl,
      trailerUrl: movie.trailerUrl,
      synopsis: movie.synopsis,
      director: movie.director,
      cast: (movie.castMembers ?? []).map((m) => ({
        name: m.name,
        role: m.role,
      })),
      genres: (movie.genres ?? []).map((g) => g.name).sort(),
      durationMinutes: movie.durationMinutes,
      classification: movie.classification,
      releaseDate: movie.releaseDate,
      rating: Number(movie.rating),
      isPremiere: movie.isPremiere,
      languages,
      formats,
      pricesByFormat: this.aggregatePricesByFormat(detailShowtimes),
      cityId: query.cityId,
      showtimes: detailShowtimes,
    };
  }

  /**
   * Películas similares por género compartido (HU-004).
   *
   * Prioriza títulos que también tengan función futura en la ciudad.
   *
   * @param movieId - Película de referencia.
   * @param query - `cityId` de contexto.
   * @returns {Promise<MovieRecommendationsResponse>} Hasta 6 recomendaciones.
   * @throws {NotFoundException} Si la película o ciudad no existen.
   */
  async getRecommendations(
    movieId: string,
    query: MovieDetailQueryDto,
  ): Promise<MovieRecommendationsResponse> {
    await this.assertCityExists(query.cityId);

    const movie = await this.movieRepo.findOne({
      where: { id: movieId, isActive: true },
      relations: { genres: true },
    });

    if (!movie) {
      throw new NotFoundException(`Película no encontrada: ${movieId}`);
    }

    const genreIds = (movie.genres ?? []).map((g) => g.id);
    if (genreIds.length === 0) {
      return { movieId, cityId: query.cityId, recommendations: [] };
    }

    const candidates = await this.movieRepo
      .createQueryBuilder('movie')
      .innerJoinAndSelect('movie.genres', 'genre')
      .innerJoin('movie.genres', 'sharedGenre')
      .where('movie.isActive = :active', { active: true })
      .andWhere('movie.id != :movieId', { movieId })
      .andWhere('sharedGenre.id IN (:...genreIds)', { genreIds })
      .orderBy('movie.rating', 'DESC')
      .addOrderBy('movie.title', 'ASC')
      .distinct(true)
      .take(MAX_RECOMMENDATIONS * 2)
      .getMany();

    const withShowtimes = await this.movieIdsWithFutureShowtimesInCity(
      candidates.map((c) => c.id),
      query.cityId,
    );

    const ranked = [...candidates].sort((a, b) => {
      const aHas = withShowtimes.has(a.id) ? 0 : 1;
      const bHas = withShowtimes.has(b.id) ? 0 : 1;
      if (aHas !== bHas) {
        return aHas - bHas;
      }
      return Number(b.rating) - Number(a.rating);
    });

    const recommendations: MovieRecommendation[] = ranked
      .slice(0, MAX_RECOMMENDATIONS)
      .map((m) => ({
        id: m.id,
        title: m.title,
        posterUrl: m.posterUrl,
        genres: (m.genres ?? []).map((g) => g.name).sort(),
        classification: m.classification,
        durationMinutes: m.durationMinutes,
        rating: Number(m.rating),
        isPremiere: m.isPremiere,
      }));

    return {
      movieId,
      cityId: query.cityId,
      recommendations,
    };
  }

  /**
   * Construye la cartelera aplicando RN-010 / RN-011 / RN-012.
   *
   * @param query - Filtros del visitante.
   * @param todayOnly - Si `true`, limita funciones al día actual.
   * @returns {Promise<BillboardResponse>}
   * @throws {NotFoundException} Ciudad inexistente.
   * @throws {BadRequestException} Fecha fuera de la ventana semanal.
   */
  private async buildBillboard(
    query: BillboardQueryDto,
    todayOnly: boolean,
  ): Promise<BillboardResponse> {
    await this.assertCityExists(query.cityId);

    const { from, to, rangeStart, rangeEnd } = this.resolveWeekWindow();

    let dayStart: Date | undefined;
    let dayEnd: Date | undefined;

    if (todayOnly) {
      ({ dayStart, dayEnd } = this.resolveDayBounds(new Date()));
    } else if (query.date) {
      this.assertDateInWindow(query.date, from, to);
      ({ dayStart, dayEnd } = this.resolveDayBounds(this.parseLocalDate(query.date)));
    }

    const showtimes = await this.findShowtimes({
      cityId: query.cityId,
      rangeStart,
      rangeEnd,
      dayStart,
      dayEnd,
      genre: query.genre,
      classification: query.classification,
      language: query.language,
      roomType: query.roomType,
      format: query.format,
      cinemaId: query.cinemaId,
      audioType: query.audioType,
      availableOnly: query.available === true,
    });

    const movies = this.groupByMovie(showtimes);

    return {
      cityId: query.cityId,
      from,
      to,
      movies,
    };
  }

  /**
   * Verifica que la ciudad exista.
   *
   * @param cityId - UUID de ciudad.
   * @throws {NotFoundException} Si no existe.
   */
  private async assertCityExists(cityId: string): Promise<void> {
    const city = await this.cityRepo.findOne({ where: { id: cityId } });
    if (!city) {
      throw new NotFoundException(`Ciudad no encontrada: ${cityId}`);
    }
  }

  /**
   * Funciones futuras activas de una película en una ciudad (RN-014).
   *
   * @param movieId - UUID de la película.
   * @param cityId - UUID de la ciudad.
   * @returns {Promise<Showtime[]>} Ordenadas por fecha.
   */
  private async findFutureShowtimesForMovie(
    movieId: string,
    cityId: string,
  ): Promise<Showtime[]> {
    return this.showtimeRepo
      .createQueryBuilder('showtime')
      .innerJoinAndSelect('showtime.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('showtime.movieId = :movieId', { movieId })
      .andWhere('showtime.isActive = :active', { active: true })
      .andWhere('cinema.isActive = :cinemaActive', { cinemaActive: true })
      .andWhere('cinema.cityId = :cityId', { cityId })
      .andWhere('showtime.startsAt > :now', { now: new Date() })
      .orderBy('showtime.startsAt', 'ASC')
      .getMany();
  }

  /**
   * IDs de películas con al menos una función futura en la ciudad.
   *
   * @param movieIds - Candidatos a recomendar.
   * @param cityId - Ciudad de contexto.
   */
  private async movieIdsWithFutureShowtimesInCity(
    movieIds: string[],
    cityId: string,
  ): Promise<Set<string>> {
    if (movieIds.length === 0) {
      return new Set();
    }

    const rows = await this.showtimeRepo
      .createQueryBuilder('showtime')
      .innerJoin('showtime.room', 'room')
      .innerJoin('room.cinema', 'cinema')
      .select('DISTINCT showtime.movieId', 'movieId')
      .where('showtime.movieId IN (:...movieIds)', { movieIds })
      .andWhere('showtime.isActive = :active', { active: true })
      .andWhere('cinema.cityId = :cityId', { cityId })
      .andWhere('showtime.startsAt > :now', { now: new Date() })
      .getRawMany<{ movieId: string }>();

    return new Set(rows.map((r) => r.movieId));
  }

  /**
   * Mapea una entidad Showtime al DTO de detalle.
   *
   * @param showtime - Función con room/cinema cargados.
   */
  private toDetailShowtime(showtime: Showtime): MovieDetailShowtime {
    return {
      id: showtime.id,
      startsAt: showtime.startsAt.toISOString(),
      format: showtime.format,
      language: showtime.language,
      audioType: showtime.audioType,
      price: Number(showtime.price),
      isSoldOut: showtime.soldSeats >= showtime.room.capacity,
      cinema: {
        id: showtime.room.cinema.id,
        name: showtime.room.cinema.name,
      },
      room: {
        id: showtime.room.id,
        name: showtime.room.name,
        roomType: showtime.room.roomType,
      },
    };
  }

  /**
   * Agrega el precio mínimo por formato a partir de las funciones listadas.
   *
   * @param showtimes - Funciones del detalle.
   */
  private aggregatePricesByFormat(
    showtimes: MovieDetailShowtime[],
  ): FormatPrice[] {
    const map = new Map<MovieFormat, number>();
    for (const s of showtimes) {
      const current = map.get(s.format);
      if (current === undefined || s.price < current) {
        map.set(s.format, s.price);
      }
    }
    return [...map.entries()]
      .map(([format, price]) => ({ format, price }))
      .sort((a, b) => a.format.localeCompare(b.format));
  }

  /**
   * Calcula la ventana [hoy 00:00, hoy+6 23:59:59.999] en hora local del servidor.
   *
   * @returns Fechas ISO `from`/`to` y límites Date para el query.
   */
  private resolveWeekWindow(): {
    from: string;
    to: string;
    rangeStart: Date;
    rangeEnd: Date;
  } {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + (BILLBOARD_DAYS - 1));
    end.setHours(23, 59, 59, 999);

    return {
      from: this.formatLocalDate(start),
      to: this.formatLocalDate(end),
      rangeStart: start,
      rangeEnd: end,
    };
  }

  /**
   * Límites [00:00, 23:59:59.999] del día de `date`.
   *
   * @param date - Día de referencia.
   */
  private resolveDayBounds(date: Date): { dayStart: Date; dayEnd: Date } {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return { dayStart, dayEnd };
  }

  /**
   * RN-012: el filtro `date` debe caer dentro de los 7 días.
   *
   * @param dateStr - YYYY-MM-DD.
   * @param from - Inicio de ventana.
   * @param to - Fin de ventana.
   */
  private assertDateInWindow(dateStr: string, from: string, to: string): void {
    if (dateStr < from || dateStr > to) {
      throw new BadRequestException(
        `date debe estar entre ${from} y ${to} (ventana de ${BILLBOARD_DAYS} días)`,
      );
    }
  }

  /**
   * Consulta funciones activas de la ciudad con filtros opcionales.
   *
   * @param filters - Criterios de búsqueda.
   * @returns {Promise<Showtime[]>} Funciones con movie/genres/room/cinema.
   */
  private async findShowtimes(filters: {
    cityId: string;
    rangeStart: Date;
    rangeEnd: Date;
    dayStart?: Date;
    dayEnd?: Date;
    genre?: string;
    classification?: string;
    language?: string;
    roomType?: string;
    format?: MovieFormat;
    cinemaId?: string;
    audioType?: AudioType;
    availableOnly: boolean;
  }): Promise<Showtime[]> {
    const qb = this.showtimeRepo
      .createQueryBuilder('showtime')
      .innerJoinAndSelect('showtime.movie', 'movie')
      .leftJoinAndSelect('movie.genres', 'genre')
      .innerJoinAndSelect('showtime.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('showtime.isActive = :active', { active: true })
      .andWhere('movie.isActive = :movieActive', { movieActive: true })
      .andWhere('cinema.isActive = :cinemaActive', { cinemaActive: true })
      .andWhere('cinema.cityId = :cityId', { cityId: filters.cityId })
      .andWhere('showtime.startsAt >= :rangeStart', {
        rangeStart: filters.rangeStart,
      })
      .andWhere('showtime.startsAt <= :rangeEnd', {
        rangeEnd: filters.rangeEnd,
      })
      .distinct(true)
      .orderBy('movie.title', 'ASC')
      .addOrderBy('showtime.startsAt', 'ASC');

    if (filters.dayStart && filters.dayEnd) {
      qb.andWhere('showtime.startsAt >= :dayStart', {
        dayStart: filters.dayStart,
      }).andWhere('showtime.startsAt <= :dayEnd', { dayEnd: filters.dayEnd });
    }

    if (filters.genre) {
      qb.innerJoin('movie.genres', 'genreFilter').andWhere(
        'LOWER(genreFilter.name) LIKE LOWER(:genre)',
        { genre: `%${filters.genre}%` },
      );
    }

    if (filters.classification) {
      qb.andWhere('movie.classification = :classification', {
        classification: filters.classification,
      });
    }

    if (filters.language) {
      qb.andWhere('UPPER(showtime.language) = UPPER(:language)', {
        language: filters.language,
      });
    }

    if (filters.roomType) {
      qb.andWhere('room.roomType = :roomType', {
        roomType: filters.roomType,
      });
    }

    if (filters.format) {
      qb.andWhere('showtime.format = :format', { format: filters.format });
    }

    if (filters.cinemaId) {
      qb.andWhere('cinema.id = :cinemaId', { cinemaId: filters.cinemaId });
    }

    if (filters.audioType) {
      qb.andWhere('showtime.audioType = :audioType', {
        audioType: filters.audioType,
      });
    }

    if (filters.availableOnly) {
      qb.andWhere('showtime.soldSeats < room.capacity');
    }

    return qb.getMany();
  }

  /**
   * Agrupa funciones por película y arma la tarjeta de cartelera.
   *
   * @param showtimes - Funciones ya filtradas y con relaciones cargadas.
   * @returns {BillboardMovie[]} Películas sin duplicar.
   */
  private groupByMovie(showtimes: Showtime[]): BillboardMovie[] {
    const map = new Map<string, BillboardMovie>();
    const seenShowtimeIds = new Set<string>();

    for (const showtime of showtimes) {
      if (seenShowtimeIds.has(showtime.id)) {
        continue;
      }
      seenShowtimeIds.add(showtime.id);

      const movie = showtime.movie;
      let card = map.get(movie.id);

      if (!card) {
        card = {
          id: movie.id,
          title: movie.title,
          posterUrl: movie.posterUrl,
          genres: (movie.genres ?? []).map((g) => g.name).sort(),
          classification: movie.classification,
          durationMinutes: movie.durationMinutes,
          director: movie.director,
          rating: Number(movie.rating),
          isPremiere: movie.isPremiere,
          formats: [],
          languages: [],
          audioTypes: [],
          showtimes: [],
        };
        map.set(movie.id, card);
      }

      const entry: BillboardShowtime = {
        id: showtime.id,
        startsAt: showtime.startsAt.toISOString(),
        format: showtime.format,
        language: showtime.language,
        audioType: showtime.audioType,
        isSoldOut: showtime.soldSeats >= showtime.room.capacity,
        cinema: {
          id: showtime.room.cinema.id,
          name: showtime.room.cinema.name,
        },
        room: {
          id: showtime.room.id,
          name: showtime.room.name,
          roomType: showtime.room.roomType,
        },
      };

      card.showtimes.push(entry);

      if (!card.formats.includes(showtime.format)) {
        card.formats.push(showtime.format);
      }
      if (!card.languages.includes(showtime.language)) {
        card.languages.push(showtime.language);
      }
      if (!card.audioTypes.includes(showtime.audioType)) {
        card.audioTypes.push(showtime.audioType);
      }
    }

    return Array.from(map.values());
  }

  /**
   * Formatea una Date local como YYYY-MM-DD.
   *
   * @param date - Fecha a formatear.
   */
  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Parsea YYYY-MM-DD como medianoche local (no UTC).
   *
   * @param dateStr - Fecha ISO corta.
   */
  private parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
