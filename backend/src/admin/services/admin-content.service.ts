import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CastMember } from '../../movies/entities/cast-member.entity';
import { Genre } from '../../movies/entities/genre.entity';
import { MovieCityRelease } from '../../movies/entities/movie-city-release.entity';
import { Movie } from '../../movies/entities/movie.entity';
import { Showtime } from '../../movies/entities/showtime.entity';
import { Room } from '../../movies/entities/room.entity';
import { MoviesService } from '../../movies/movies.service';
import { Snack } from '../../snacks/entities/snack.entity';
import {
  AdminPage,
  AdminPaginationQueryDto,
} from '../dto/admin-pagination.dto';
import {
  CreateMovieDto,
  CreateShowtimeDto,
  CreateSnackDto,
  UpdateMovieDto,
  UpdateShowtimeDto,
  UpdateSnackDto,
} from '../dto/admin-write.dto';

/**
 * CRUD películas, funciones y confitería (HU-020).
 */
@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepo: Repository<Genre>,
    @InjectRepository(CastMember)
    private readonly castRepo: Repository<CastMember>,
    @InjectRepository(MovieCityRelease)
    private readonly releaseRepo: Repository<MovieCityRelease>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(Snack)
    private readonly snackRepo: Repository<Snack>,
    private readonly moviesService: MoviesService,
  ) {}

  // ── Movies ─────────────────────────────────────────────────

  /**
   * @param query - Paginación / búsqueda.
   * @returns Página de películas.
   */
  async listMovies(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPage<Movie>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.movieRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.genres', 'g')
      .orderBy('m.title', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.q) {
      qb.andWhere('m.title ILIKE :q', { q: `%${query.q}%` });
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  /**
   * @param id - UUID.
   * @returns Película con elenco y estrenos.
   */
  async getMovie(id: string): Promise<Movie> {
    const movie = await this.movieRepo.findOne({
      where: { id },
      relations: ['genres', 'castMembers', 'cityReleases'],
    });
    if (!movie) throw new NotFoundException(`Película no encontrada: ${id}`);
    return movie;
  }

  /**
   * @param dto - Datos de película.
   * @returns Película creada.
   */
  async createMovie(dto: CreateMovieDto): Promise<Movie> {
    const genres = await this.resolveGenres(dto.genres ?? []);
    const movie = await this.movieRepo.save(
      this.movieRepo.create({
        title: dto.title.trim(),
        posterUrl: dto.posterUrl,
        bannerUrl: dto.bannerUrl ?? null,
        trailerUrl: dto.trailerUrl ?? null,
        synopsis: dto.synopsis ?? null,
        releaseDate: dto.releaseDate ?? null,
        classification: dto.classification,
        durationMinutes: dto.durationMinutes,
        director: dto.director,
        rating: dto.rating ?? 0,
        isPremiere: dto.isPremiere ?? false,
        status: dto.status,
        isActive: dto.isActive ?? true,
        genres,
      }),
    );

    if (dto.cast?.length) {
      await this.castRepo.save(
        dto.cast.map((c, i) =>
          this.castRepo.create({
            movieId: movie.id,
            name: c.name,
            role: c.role ?? null,
            sortOrder: c.sortOrder ?? i,
          }),
        ),
      );
    }

    if (dto.cityReleases?.length) {
      await this.releaseRepo.save(
        dto.cityReleases.map((r) =>
          this.releaseRepo.create({
            movieId: movie.id,
            cityId: r.cityId,
            cinemaId: r.cinemaId ?? null,
            releaseDate: r.releaseDate,
          }),
        ),
      );
    }

    return this.getMovie(movie.id);
  }

  /**
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Película.
   */
  async updateMovie(id: string, dto: UpdateMovieDto): Promise<Movie> {
    const movie = await this.getMovie(id);
    if (dto.title !== undefined) movie.title = dto.title.trim();
    if (dto.posterUrl !== undefined) movie.posterUrl = dto.posterUrl;
    if (dto.bannerUrl !== undefined) movie.bannerUrl = dto.bannerUrl ?? null;
    if (dto.trailerUrl !== undefined) movie.trailerUrl = dto.trailerUrl ?? null;
    if (dto.synopsis !== undefined) movie.synopsis = dto.synopsis ?? null;
    if (dto.releaseDate !== undefined) movie.releaseDate = dto.releaseDate ?? null;
    if (dto.classification !== undefined) movie.classification = dto.classification;
    if (dto.durationMinutes !== undefined) {
      movie.durationMinutes = dto.durationMinutes;
    }
    if (dto.director !== undefined) movie.director = dto.director;
    if (dto.rating !== undefined) movie.rating = dto.rating;
    if (dto.isPremiere !== undefined) movie.isPremiere = dto.isPremiere;
    if (dto.status !== undefined) movie.status = dto.status;
    if (dto.isActive !== undefined) movie.isActive = dto.isActive;
    if (dto.genres !== undefined) {
      movie.genres = await this.resolveGenres(dto.genres);
    }
    await this.movieRepo.save(movie);

    if (dto.cast !== undefined) {
      await this.castRepo.delete({ movieId: id });
      if (dto.cast.length) {
        await this.castRepo.save(
          dto.cast.map((c, i) =>
            this.castRepo.create({
              movieId: id,
              name: c.name,
              role: c.role ?? null,
              sortOrder: c.sortOrder ?? i,
            }),
          ),
        );
      }
    }

    if (dto.cityReleases !== undefined) {
      await this.releaseRepo.delete({ movieId: id });
      if (dto.cityReleases.length) {
        await this.releaseRepo.save(
          dto.cityReleases.map((r) =>
            this.releaseRepo.create({
              movieId: id,
              cityId: r.cityId,
              cinemaId: r.cinemaId ?? null,
              releaseDate: r.releaseDate,
            }),
          ),
        );
      }
    }

    return this.getMovie(id);
  }

  /**
   * Publica (isActive=true) o despublica.
   *
   * @param id - UUID.
   * @param publish - true = publicar.
   * @returns Película.
   */
  async setPublished(id: string, publish: boolean): Promise<Movie> {
    const movie = await this.getMovie(id);
    movie.isActive = publish;
    await this.movieRepo.save(movie);
    return movie;
  }

  /**
   * Promueve UPCOMING → NOW_SHOWING y dispara avisos (RN-020).
   *
   * @param id - UUID.
   * @returns Resultado de promoción.
   */
  promoteToNowShowing(id: string) {
    return this.moviesService.promoteToNowShowing(id);
  }

  /**
   * Soft-delete lógico (`isActive=false`).
   *
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteMovie(id: string): Promise<{ deleted: true }> {
    await this.setPublished(id, false);
    return { deleted: true };
  }

  // ── Showtimes ──────────────────────────────────────────────

  /**
   * @param query - Paginación.
   * @param movieId - Filtro.
   * @returns Página de funciones.
   */
  async listShowtimes(
    query: AdminPaginationQueryDto,
    movieId?: string,
  ): Promise<AdminPage<Showtime>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.showtimeRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.movie', 'm')
      .leftJoinAndSelect('s.room', 'r')
      .orderBy('s.startsAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (movieId) qb.andWhere('s.movieId = :movieId', { movieId });
    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  /**
   * @param dto - Datos.
   * @returns Función.
   */
  async createShowtime(dto: CreateShowtimeDto): Promise<Showtime> {
    await this.requireMovie(dto.movieId);
    await this.requireRoom(dto.roomId);
    return this.showtimeRepo.save(
      this.showtimeRepo.create({
        movieId: dto.movieId,
        roomId: dto.roomId,
        startsAt: new Date(dto.startsAt),
        format: dto.format,
        language: dto.language,
        audioType: dto.audioType,
        price: dto.price,
        maxSeatsPerOrder: dto.maxSeatsPerOrder ?? 8,
        isActive: dto.isActive ?? true,
        soldSeats: 0,
      }),
    );
  }

  /**
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Función.
   */
  async updateShowtime(
    id: string,
    dto: UpdateShowtimeDto,
  ): Promise<Showtime> {
    const row = await this.requireShowtime(id);
    if (dto.movieId !== undefined) {
      await this.requireMovie(dto.movieId);
      row.movieId = dto.movieId;
    }
    if (dto.roomId !== undefined) {
      await this.requireRoom(dto.roomId);
      row.roomId = dto.roomId;
    }
    if (dto.startsAt !== undefined) row.startsAt = new Date(dto.startsAt);
    if (dto.format !== undefined) row.format = dto.format;
    if (dto.language !== undefined) row.language = dto.language;
    if (dto.audioType !== undefined) row.audioType = dto.audioType;
    if (dto.price !== undefined) row.price = dto.price;
    if (dto.maxSeatsPerOrder !== undefined) {
      row.maxSeatsPerOrder = dto.maxSeatsPerOrder;
    }
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.showtimeRepo.save(row);
  }

  /**
   * Cancela una función (`isActive=false`).
   *
   * @param id - UUID.
   * @returns Función cancelada.
   */
  async cancelShowtime(id: string): Promise<Showtime> {
    return this.updateShowtime(id, { isActive: false });
  }

  /**
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteShowtime(id: string): Promise<{ deleted: true }> {
    await this.requireShowtime(id);
    await this.showtimeRepo.delete(id);
    return { deleted: true };
  }

  // ── Snacks ─────────────────────────────────────────────────

  /**
   * @param query - Paginación.
   * @returns Página de snacks.
   */
  async listSnacks(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPage<Snack>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.snackRepo
      .createQueryBuilder('s')
      .orderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.q) {
      qb.andWhere('s.name ILIKE :q', { q: `%${query.q}%` });
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  /**
   * @param dto - Datos.
   * @returns Snack.
   */
  async createSnack(dto: CreateSnackDto): Promise<Snack> {
    return this.snackRepo.save(
      this.snackRepo.create({
        name: dto.name.trim(),
        description: dto.description,
        imageUrl: dto.imageUrl,
        category: dto.category,
        price: dto.price,
        stock: dto.stock,
        isActive: dto.isActive ?? true,
        cinemaId: dto.cinemaId ?? null,
        promoLabel: dto.promoLabel ?? null,
        promoPercent: dto.promoPercent ?? 0,
      }),
    );
  }

  /**
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Snack.
   */
  async updateSnack(id: string, dto: UpdateSnackDto): Promise<Snack> {
    const row = await this.requireSnack(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.imageUrl !== undefined) row.imageUrl = dto.imageUrl;
    if (dto.category !== undefined) row.category = dto.category;
    if (dto.price !== undefined) row.price = dto.price;
    if (dto.stock !== undefined) row.stock = dto.stock;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    if (dto.cinemaId !== undefined) row.cinemaId = dto.cinemaId;
    if (dto.promoLabel !== undefined) row.promoLabel = dto.promoLabel;
    if (dto.promoPercent !== undefined) row.promoPercent = dto.promoPercent;
    return this.snackRepo.save(row);
  }

  /**
   * Soft-delete (`isActive=false`).
   *
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteSnack(id: string): Promise<{ deleted: true }> {
    const row = await this.requireSnack(id);
    row.isActive = false;
    await this.snackRepo.save(row);
    return { deleted: true };
  }

  // ── helpers ────────────────────────────────────────────────

  private async resolveGenres(names: string[]): Promise<Genre[]> {
    if (!names.length) return [];
    const normalized = names.map((n) => n.trim()).filter(Boolean);
    const existing = await this.genreRepo.find({
      where: { name: In(normalized) },
    });
    const have = new Set(existing.map((g) => g.name.toLowerCase()));
    const created: Genre[] = [];
    for (const name of normalized) {
      if (!have.has(name.toLowerCase())) {
        created.push(await this.genreRepo.save(this.genreRepo.create({ name })));
        have.add(name.toLowerCase());
      }
    }
    return [...existing, ...created];
  }

  private async requireMovie(id: string): Promise<Movie> {
    const row = await this.movieRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Película no encontrada: ${id}`);
    return row;
  }

  private async requireRoom(id: string): Promise<Room> {
    const row = await this.roomRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Sala no encontrada: ${id}`);
    return row;
  }

  private async requireShowtime(id: string): Promise<Showtime> {
    const row = await this.showtimeRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Función no encontrada: ${id}`);
    return row;
  }

  private async requireSnack(id: string): Promise<Snack> {
    const row = await this.snackRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Snack no encontrado: ${id}`);
    return row;
  }
}
