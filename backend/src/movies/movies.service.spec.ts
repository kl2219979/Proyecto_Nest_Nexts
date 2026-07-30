/**
 * Tests unitarios de `MoviesService` (HU-003 / HU-004).
 *
 * No levantamos Postgres: mockeamos repositorios TypeORM.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { City } from '../locations/entities/city.entity';
import { Movie } from './entities/movie.entity';
import { Showtime } from './entities/showtime.entity';
import { AudioType, MovieFormat, RoomType } from './enums/movie.enums';
import { MoviesService } from './movies.service';

describe('MoviesService', () => {
  let service: MoviesService;

  const movieRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const showtimeRepo = {
    createQueryBuilder: jest.fn(),
  };
  const cityRepo = {
    findOne: jest.fn(),
  };

  /**
   * Arma el módulo de testing con repos falsos.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: getRepositoryToken(Movie), useValue: movieRepo },
        { provide: getRepositoryToken(Showtime), useValue: showtimeRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
      ],
    }).compile();

    service = module.get(MoviesService);
  });

  /**
   * Helper: mock fluente del QueryBuilder de showtimes.
   *
   * @param showtimes - Filas que devolverá `getMany`.
   */
  function mockShowtimeQb(showtimes: unknown[]) {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(showtimes),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    showtimeRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  /**
   * Ciudad inexistente → 404.
   *
   * @returns {Promise<void>}
   */
  it('getWeeklyBillboard throws when city is missing', async () => {
    cityRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getWeeklyBillboard({
        cityId: '00000000-0000-4000-8000-000000000001',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  /**
   * Agrupa funciones por película y marca agotadas.
   *
   * @returns {Promise<void>}
   */
  it('getWeeklyBillboard groups showtimes and flags sold-out', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1', name: 'Medellín' });

    mockShowtimeQb([
      {
        id: 'st-1',
        startsAt: new Date('2026-07-30T14:00:00'),
        format: MovieFormat.TWO_D,
        language: 'ES',
        audioType: AudioType.DUBBED,
        soldSeats: 10,
        movie: {
          id: 'm-1',
          title: 'Odisea Estelar',
          posterUrl: 'https://example.com/p.jpg',
          classification: '12+',
          durationMinutes: 142,
          director: 'Ana',
          rating: '8.4',
          isPremiere: true,
          genres: [{ name: 'Acción' }, { name: 'Aventura' }],
        },
        room: {
          id: 'r-1',
          name: 'Sala 1',
          roomType: RoomType.STANDARD,
          capacity: 120,
          cinema: { id: 'c-1', name: 'Multicine Laureles' },
        },
      },
      {
        id: 'st-soldout',
        startsAt: new Date('2026-07-30T21:00:00'),
        format: MovieFormat.THREE_D,
        language: 'ES',
        audioType: AudioType.DUBBED,
        soldSeats: 120,
        movie: {
          id: 'm-1',
          title: 'Odisea Estelar',
          posterUrl: 'https://example.com/p.jpg',
          classification: '12+',
          durationMinutes: 142,
          director: 'Ana',
          rating: '8.4',
          isPremiere: true,
          genres: [{ name: 'Acción' }, { name: 'Aventura' }],
        },
        room: {
          id: 'r-1',
          name: 'Sala 1',
          roomType: RoomType.STANDARD,
          capacity: 120,
          cinema: { id: 'c-1', name: 'Multicine Laureles' },
        },
      },
    ]);

    const result = await service.getWeeklyBillboard({
      cityId: '00000000-0000-4000-8000-000000000001',
    });

    expect(result.movies).toHaveLength(1);
    expect(result.movies[0].title).toBe('Odisea Estelar');
    expect(result.movies[0].formats).toEqual(
      expect.arrayContaining([MovieFormat.TWO_D, MovieFormat.THREE_D]),
    );
    expect(result.movies[0].showtimes).toHaveLength(2);
    expect(result.movies[0].showtimes[1].isSoldOut).toBe(true);
    expect(result.from <= result.to).toBe(true);
  });

  /**
   * RN-011: available=true añade condición soldSeats < capacity.
   *
   * @returns {Promise<void>}
   */
  it('getWeeklyBillboard with available=true adds sold-out filter', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    const qb = mockShowtimeQb([]);

    await service.getWeeklyBillboard({
      cityId: '00000000-0000-4000-8000-000000000001',
      available: true,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'showtime.soldSeats < room.capacity',
    );
  });

  /**
   * date fuera de la ventana de 7 días → 400.
   *
   * @returns {Promise<void>}
   */
  it('getWeeklyBillboard rejects date outside the 7-day window', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });

    await expect(
      service.getWeeklyBillboard({
        cityId: '00000000-0000-4000-8000-000000000001',
        date: '2099-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  /**
   * /today limita al día actual (añade dayStart/dayEnd).
   *
   * @returns {Promise<void>}
   */
  it('getTodayBillboard scopes showtimes to today', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    const qb = mockShowtimeQb([]);

    await service.getTodayBillboard({
      cityId: '00000000-0000-4000-8000-000000000001',
    });

    const dayCalls = qb.andWhere.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        (call[0].includes('dayStart') || call[0].includes('dayEnd')),
    );
    expect(dayCalls.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * HU-004: detalle con elenco, precios y funciones futuras (RN-014/015).
   *
   * @returns {Promise<void>}
   */
  it('getMovieDetail returns cast, prices and sold-out flag', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    movieRepo.findOne.mockResolvedValue({
      id: 'm-1',
      title: 'Odisea Estelar',
      posterUrl: 'https://example.com/p.jpg',
      bannerUrl: 'https://example.com/b.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=abc',
      synopsis: 'Sinopsis demo',
      director: 'Ana Restrepo',
      classification: '12+',
      durationMinutes: 142,
      releaseDate: '2026-07-01',
      rating: '8.4',
      isPremiere: true,
      genres: [{ name: 'Acción' }],
      castMembers: [
        { name: 'Diego Vargas', role: 'Capitán Nova', sortOrder: 0 },
      ],
    });

    mockShowtimeQb([
      {
        id: 'st-1',
        startsAt: new Date('2026-08-01T18:00:00Z'),
        format: MovieFormat.IMAX,
        language: 'EN',
        audioType: AudioType.SUBTITLED,
        soldSeats: 200,
        price: '32000.00',
        room: {
          id: 'r-1',
          name: 'IMAX 1',
          roomType: RoomType.IMAX,
          capacity: 200,
          cinema: { id: 'c-1', name: 'Multicine Laureles' },
        },
      },
      {
        id: 'st-2',
        startsAt: new Date('2026-08-01T20:00:00Z'),
        format: MovieFormat.TWO_D,
        language: 'ES',
        audioType: AudioType.DUBBED,
        soldSeats: 5,
        price: '18000.00',
        room: {
          id: 'r-2',
          name: 'Sala 1',
          roomType: RoomType.STANDARD,
          capacity: 120,
          cinema: { id: 'c-1', name: 'Multicine Laureles' },
        },
      },
    ]);

    const detail = await service.getMovieDetail('m-1', {
      cityId: '00000000-0000-4000-8000-000000000001',
    });

    expect(detail.title).toBe('Odisea Estelar');
    expect(detail.trailerUrl).toContain('youtube');
    expect(detail.cast).toHaveLength(1);
    expect(detail.showtimes[0].isSoldOut).toBe(true);
    expect(detail.pricesByFormat).toEqual(
      expect.arrayContaining([
        { format: MovieFormat.IMAX, price: 32000 },
        { format: MovieFormat.TWO_D, price: 18000 },
      ]),
    );
  });

  /**
   * HU-004: película inexistente → 404.
   *
   * @returns {Promise<void>}
   */
  it('getMovieDetail throws when movie is missing', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    movieRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getMovieDetail('missing', {
        cityId: '00000000-0000-4000-8000-000000000001',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  /**
   * HU-004: recomendaciones por género compartido.
   *
   * @returns {Promise<void>}
   */
  it('getRecommendations returns similar movies by genre', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    movieRepo.findOne.mockResolvedValue({
      id: 'm-1',
      isActive: true,
      genres: [{ id: 'g-aventura', name: 'Aventura' }],
    });

    const movieQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'm-2',
          title: 'Pixel Heroes',
          posterUrl: 'https://example.com/pixel.jpg',
          classification: 'T',
          durationMinutes: 95,
          rating: '8.1',
          isPremiere: true,
          genres: [{ name: 'Aventura' }, { name: 'Animación' }],
        },
      ]),
    };
    movieRepo.createQueryBuilder.mockReturnValue(movieQb);

    const stQb = mockShowtimeQb([]);
    stQb.getRawMany.mockResolvedValue([{ movieId: 'm-2' }]);

    const result = await service.getRecommendations('m-1', {
      cityId: '00000000-0000-4000-8000-000000000001',
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].title).toBe('Pixel Heroes');
    expect(result.movieId).toBe('m-1');
  });
});
