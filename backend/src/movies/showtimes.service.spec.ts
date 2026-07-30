/**
 * Tests unitarios de `ShowtimesService` (HU-009).
 */
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { City } from '../locations/entities/city.entity';
import { Movie } from './entities/movie.entity';
import { Showtime } from './entities/showtime.entity';
import {
  AudioType,
  MovieFormat,
  RoomType,
} from './enums/movie.enums';
import { ShowtimesService } from './showtimes.service';

describe('ShowtimesService', () => {
  let service: ShowtimesService;

  const showtimeRepo = {
    createQueryBuilder: jest.fn(),
  };
  const movieRepo = {
    findOne: jest.fn(),
  };
  const cityRepo = {
    findOne: jest.fn(),
  };

  /**
   * Arma el módulo de testing.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    cityRepo.findOne.mockResolvedValue({ id: 'city-1', isActive: true });
    movieRepo.findOne.mockResolvedValue({ id: 'movie-1', isActive: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowtimesService,
        { provide: getRepositoryToken(Showtime), useValue: showtimeRepo },
        { provide: getRepositoryToken(Movie), useValue: movieRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
      ],
    }).compile();

    service = module.get(ShowtimesService);
  });

  /**
   * Helper: QueryBuilder fluente de showtimes.
   *
   * @param showtimes - Filas de `getMany` / `getOne`.
   */
  function mockShowtimeQb(showtimes: unknown[] | unknown | null) {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(
        Array.isArray(showtimes) ? showtimes : [],
      ),
      getOne: jest.fn().mockResolvedValue(
        Array.isArray(showtimes) ? showtimes[0] ?? null : showtimes,
      ),
    };
    showtimeRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  /**
   * Lista funciones futuras con disponibilidad y facetas.
   *
   * @returns {Promise<void>}
   */
  it('listFunctionsForMovie returns selectable functions and facets', async () => {
    const startsAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
    mockShowtimeQb([
      {
        id: 'fn-1',
        startsAt,
        format: MovieFormat.TWO_D,
        language: 'ES',
        audioType: AudioType.DUBBED,
        price: '18000.00',
        soldSeats: 10,
        movieId: 'movie-1',
        room: {
          id: 'room-1',
          name: 'Sala 1',
          roomType: RoomType.STANDARD,
          capacity: 100,
          cinema: { id: 'cin-1', name: 'Multicine Centro' },
        },
      },
      {
        id: 'fn-2',
        startsAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
        format: MovieFormat.IMAX,
        language: 'EN',
        audioType: AudioType.SUBTITLED,
        price: '32000.00',
        soldSeats: 200,
        movieId: 'movie-1',
        room: {
          id: 'room-2',
          name: 'IMAX 1',
          roomType: RoomType.IMAX,
          capacity: 200,
          cinema: { id: 'cin-1', name: 'Multicine Centro' },
        },
      },
    ]);

    const result = await service.listFunctionsForMovie('movie-1', {
      cityId: 'city-1',
    });

    expect(result.functions).toHaveLength(2);
    expect(result.functions[0]?.availableSeats).toBe(90);
    expect(result.functions[0]?.isSelectable).toBe(true);
    expect(result.functions[1]?.isSoldOut).toBe(true);
    expect(result.functions[1]?.isSelectable).toBe(false);
    expect(result.facets.formats).toEqual(
      expect.arrayContaining([MovieFormat.TWO_D, MovieFormat.IMAX]),
    );
    expect(result.facets.cinemas).toEqual([
      { id: 'cin-1', name: 'Multicine Centro' },
    ]);
  });

  /**
   * Ciudad inválida → 404.
   *
   * @returns {Promise<void>}
   */
  it('listFunctionsForMovie throws when city missing', async () => {
    cityRepo.findOne.mockResolvedValue(null);
    await expect(
      service.listFunctionsForMovie('movie-1', { cityId: 'bad' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  /**
   * Precio de función futura activa (RN-037 / RN-038 stub).
   *
   * @returns {Promise<void>}
   */
  it('getFunctionPrices returns base price and empty promotions', async () => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    mockShowtimeQb({
      id: 'fn-1',
      movieId: 'movie-1',
      startsAt,
      isActive: true,
      format: MovieFormat.VIP,
      language: 'ES',
      audioType: AudioType.DUBBED,
      price: '45000.00',
      soldSeats: 5,
      room: {
        id: 'room-3',
        name: 'VIP 1',
        roomType: RoomType.VIP,
        capacity: 40,
        cinema: { id: 'cin-2', name: 'Multicine Norte' },
      },
    });

    const prices = await service.getFunctionPrices('fn-1');

    expect(prices.basePrice).toBe(45000);
    expect(prices.finalPrice).toBe(45000);
    expect(prices.promotions).toEqual([]);
    expect(prices.discountTotal).toBe(0);
    expect(prices.priceFactors.format).toBe(MovieFormat.VIP);
    expect(prices.availableSeats).toBe(35);
    expect(prices.isSelectable).toBe(true);
  });

  /**
   * RN-035: función ya iniciada no se puede consultar para comprar.
   *
   * @returns {Promise<void>}
   */
  it('getFunctionPrices rejects started function (RN-035)', async () => {
    mockShowtimeQb({
      id: 'fn-old',
      startsAt: new Date(Date.now() - 60_000),
      isActive: true,
      price: 10000,
      soldSeats: 0,
      room: {
        capacity: 50,
        roomType: RoomType.STANDARD,
        cinema: { id: 'c', name: 'X' },
      },
    });

    await expect(service.getFunctionPrices('fn-old')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  /**
   * RN-036: función inactiva.
   *
   * @returns {Promise<void>}
   */
  it('getFunctionPrices rejects inactive function (RN-036)', async () => {
    mockShowtimeQb({
      id: 'fn-off',
      startsAt: new Date(Date.now() + 60_000),
      isActive: false,
      price: 10000,
      soldSeats: 0,
      room: {
        capacity: 50,
        roomType: RoomType.STANDARD,
        cinema: { id: 'c', name: 'X' },
      },
    });

    await expect(service.getFunctionPrices('fn-off')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
