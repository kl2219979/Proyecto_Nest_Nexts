import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../locations/entities/city.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { MovieFunctionsQueryDto } from './dto/movie-functions-query.dto';
import {
  FunctionPricesResponse,
  MovieFunctionItem,
  MovieFunctionsFacets,
  MovieFunctionsResponse,
} from './dto/movie-functions-response';
import { Movie } from './entities/movie.entity';
import { Showtime } from './entities/showtime.entity';
import { AudioType, MovieFormat, RoomType } from './enums/movie.enums';

/**
 * Selección de función y precios (HU-009 + promos HU-026).
 *
 * RN-035: solo funciones futuras (`startsAt > now`).
 * RN-036: solo activas (`isActive`).
 * RN-037: precio por función (formato / sala / horario).
 * RN-038: promociones automáticas desde el catálogo (HU-026).
 *
 * Separado de `MoviesService` (cartelera/detalle) para no mezclar
 * responsabilidades (SOLID — Single Responsibility).
 */
@Injectable()
export class ShowtimesService {
  /**
   * @param showtimeRepo - Funciones de proyección.
   * @param movieRepo - Valida que la película exista.
   * @param cityRepo - Valida ciudad de contexto.
   * @param promotionsService - Promos aplicables (RN-038).
   */
  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    private readonly promotionsService: PromotionsService,
  ) {}

  /**
   * `GET /movies/:id/functions`: listado filtrable para el flujo de compra.
   *
   * @param movieId - UUID de la película.
   * @param query - `cityId` + filtros opcionales (fecha, formato, …).
   * @returns {Promise<MovieFunctionsResponse>} Funciones + facetas.
   */
  async listFunctionsForMovie(
    movieId: string,
    query: MovieFunctionsQueryDto,
  ): Promise<MovieFunctionsResponse> {
    await this.assertCityExists(query.cityId);
    await this.assertMovieExists(movieId);

    const showtimes = await this.querySelectableShowtimes({
      movieId,
      cityId: query.cityId,
      date: query.date,
      cinemaId: query.cinemaId,
      format: query.format,
      language: query.language,
      audioType: query.audioType,
      roomType: query.roomType,
      availableOnly: query.available === true,
    });

    const functions = showtimes.map((s) => this.toFunctionItem(s));

    return {
      movieId,
      cityId: query.cityId,
      functions,
      facets: this.buildFacets(functions),
    };
  }

  /**
   * `GET /functions/:id/prices`: precio actualizado de una función.
   *
   * El frontend llama esto al cambiar formato/función para refrescar
   * el valor sin recargar la página.
   *
   * @param functionId - UUID de la función (`showtimes.id`).
   * @returns {Promise<FunctionPricesResponse>} Precio + factores + promos.
   * @throws {NotFoundException} Función inexistente, inactiva o ya iniciada.
   */
  async getFunctionPrices(
    functionId: string,
  ): Promise<FunctionPricesResponse> {
    const showtime = await this.showtimeRepo
      .createQueryBuilder('showtime')
      .innerJoinAndSelect('showtime.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('showtime.id = :functionId', { functionId })
      .getOne();

    if (!showtime) {
      throw new NotFoundException(`Función no encontrada: ${functionId}`);
    }

    if (!showtime.isActive) {
      throw new NotFoundException(
        `La función no está activa (RN-036): ${functionId}`,
      );
    }

    if (showtime.startsAt.getTime() <= Date.now()) {
      throw new NotFoundException(
        `La función ya inició y no se puede seleccionar (RN-035): ${functionId}`,
      );
    }

    const basePrice = Number(showtime.price);
    const availableSeats = Math.max(
      0,
      showtime.room.capacity - showtime.soldSeats,
    );
    const isSoldOut = availableSeats === 0;

    const promoViews = await this.promotionsService.listForFunction(
      showtime.id,
      basePrice,
    );
    const promotions = promoViews.map((p) => ({
      code: p.code ?? p.name,
      description: p.description,
      discountAmount: p.discountAmount,
    }));
    // RN-038: si hay varias automáticas, se muestra la mejor (mayor dto).
    const bestDiscount =
      promotions.length === 0
        ? 0
        : Math.max(...promotions.map((p) => p.discountAmount));

    return {
      functionId: showtime.id,
      movieId: showtime.movieId,
      startsAt: showtime.startsAt.toISOString(),
      format: showtime.format,
      language: showtime.language,
      audioType: showtime.audioType,
      cinema: {
        id: showtime.room.cinema.id,
        name: showtime.room.cinema.name,
      },
      room: {
        id: showtime.room.id,
        name: showtime.room.name,
        roomType: showtime.room.roomType,
      },
      basePrice,
      priceFactors: {
        format: showtime.format,
        roomType: showtime.room.roomType,
        startsAt: showtime.startsAt.toISOString(),
      },
      promotions,
      discountTotal: Math.round((bestDiscount + Number.EPSILON) * 100) / 100,
      finalPrice:
        Math.round((basePrice - bestDiscount + Number.EPSILON) * 100) / 100,
      currency: 'COP',
      availableSeats,
      capacity: showtime.room.capacity,
      isSoldOut,
      isSelectable: !isSoldOut,
    };
  }

  /**
   * Query de funciones futuras/activas con filtros opcionales.
   *
   * @param filters - Criterios de búsqueda.
   * @returns {Promise<Showtime[]>} Ordenadas por `startsAt`.
   */
  private async querySelectableShowtimes(filters: {
    movieId: string;
    cityId: string;
    date?: string;
    cinemaId?: string;
    format?: MovieFormat;
    language?: string;
    audioType?: AudioType;
    roomType?: RoomType;
    availableOnly?: boolean;
  }): Promise<Showtime[]> {
    const qb = this.showtimeRepo
      .createQueryBuilder('showtime')
      .innerJoinAndSelect('showtime.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('showtime.movieId = :movieId', { movieId: filters.movieId })
      .andWhere('showtime.isActive = :active', { active: true })
      .andWhere('cinema.isActive = :cinemaActive', { cinemaActive: true })
      .andWhere('cinema.cityId = :cityId', { cityId: filters.cityId })
      .andWhere('showtime.startsAt > :now', { now: new Date() });

    if (filters.date) {
      const { dayStart, dayEnd } = this.resolveDayBounds(
        this.parseLocalDate(filters.date),
      );
      qb.andWhere('showtime.startsAt >= :dayStart', { dayStart }).andWhere(
        'showtime.startsAt <= :dayEnd',
        { dayEnd },
      );
    }

    if (filters.cinemaId) {
      qb.andWhere('cinema.id = :cinemaId', { cinemaId: filters.cinemaId });
    }

    if (filters.format) {
      qb.andWhere('showtime.format = :format', { format: filters.format });
    }

    if (filters.language) {
      qb.andWhere('UPPER(showtime.language) = UPPER(:language)', {
        language: filters.language,
      });
    }

    if (filters.audioType) {
      qb.andWhere('showtime.audioType = :audioType', {
        audioType: filters.audioType,
      });
    }

    if (filters.roomType) {
      qb.andWhere('room.roomType = :roomType', {
        roomType: filters.roomType,
      });
    }

    if (filters.availableOnly) {
      qb.andWhere('showtime.soldSeats < room.capacity');
    }

    return qb.orderBy('showtime.startsAt', 'ASC').getMany();
  }

  /**
   * Mapea entidad → ítem de selección con disponibilidad.
   *
   * @param showtime - Función con room/cinema.
   */
  private toFunctionItem(showtime: Showtime): MovieFunctionItem {
    const availableSeats = Math.max(
      0,
      showtime.room.capacity - showtime.soldSeats,
    );
    const isSoldOut = availableSeats === 0;

    return {
      id: showtime.id,
      startsAt: showtime.startsAt.toISOString(),
      date: this.formatLocalDate(showtime.startsAt),
      format: showtime.format,
      language: showtime.language,
      audioType: showtime.audioType,
      price: Number(showtime.price),
      capacity: showtime.room.capacity,
      soldSeats: showtime.soldSeats,
      availableSeats,
      isSoldOut,
      isSelectable: !isSoldOut,
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
   * Facetas del resultado para filtros de UI (cambio de formato sin recarga).
   *
   * @param functions - Ítems ya filtrados.
   */
  private buildFacets(functions: MovieFunctionItem[]): MovieFunctionsFacets {
    const dates = new Set<string>();
    const formats = new Set<MovieFormat>();
    const languages = new Set<string>();
    const audioTypes = new Set<AudioType>();
    const roomTypes = new Set<RoomType>();
    const cinemas = new Map<string, string>();

    for (const fn of functions) {
      dates.add(fn.date);
      formats.add(fn.format);
      languages.add(fn.language);
      audioTypes.add(fn.audioType);
      roomTypes.add(fn.room.roomType);
      cinemas.set(fn.cinema.id, fn.cinema.name);
    }

    return {
      dates: [...dates].sort(),
      formats: [...formats].sort((a, b) => a.localeCompare(b)),
      languages: [...languages].sort(),
      audioTypes: [...audioTypes].sort((a, b) => a.localeCompare(b)),
      roomTypes: [...roomTypes].sort((a, b) => a.localeCompare(b)),
      cinemas: [...cinemas.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * @param cityId - UUID de ciudad.
   * @throws {NotFoundException} Ciudad inexistente o inactiva.
   */
  private async assertCityExists(cityId: string): Promise<void> {
    const city = await this.cityRepo.findOne({
      where: { id: cityId, isActive: true },
    });
    if (!city) {
      throw new NotFoundException(`Ciudad no encontrada o inactiva: ${cityId}`);
    }
  }

  /**
   * @param movieId - UUID de película.
   * @throws {NotFoundException} Película inexistente o inactiva.
   */
  private async assertMovieExists(movieId: string): Promise<void> {
    const movie = await this.movieRepo.findOne({
      where: { id: movieId, isActive: true },
    });
    if (!movie) {
      throw new NotFoundException(`Película no encontrada: ${movieId}`);
    }
  }

  /**
   * Fecha local YYYY-MM-DD del servidor (consistente con cartelera HU-003).
   *
   * @param date - Instantánea.
   */
  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Parsea YYYY-MM-DD como medianoche local.
   *
   * @param dateStr - Fecha corta.
   */
  private parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y!, m! - 1, d);
  }

  /**
   * Límites [00:00, 23:59:59.999] del día local.
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
}
