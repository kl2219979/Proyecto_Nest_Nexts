/**
 * Tests unitarios de `RecommendationsService` (HU-022).
 */
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { RecommendationFeed } from './entities/recommendation-feed.entity';
import { RecommendationPreference } from './entities/recommendation-preference.entity';
import { RecommendationSignalSource } from './enums/recommendations.enums';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const preferenceRepo = {
    findOne: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: RecommendationPreference) => ({
      ...x,
      id: x.id ?? 'pref-1',
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
      createdAt: new Date('2026-07-31T12:00:00.000Z'),
    })),
  };

  const feedRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: RecommendationFeed) => ({
      ...x,
      id: x.id ?? 'feed-1',
      computedAt: x.computedAt ?? new Date(),
    })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const orderRepo = {
    find: jest.fn(),
  };

  const movieRepo = {
    find: jest.fn(),
  };

  const showtimeQb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const showtimeRepo = {
    createQueryBuilder: jest.fn(() => showtimeQb),
  };

  const cityRepo = {
    findOne: jest.fn(),
  };

  const profileRepo = {
    findOne: jest.fn(),
  };

  const config = {
    get: jest.fn((_key: string, fallback: number) => fallback),
  };

  const actionMovie = {
    id: 'movie-action',
    title: 'Misión Imposible 9',
    posterUrl: 'https://example.com/mi9.jpg',
    classification: '12+',
    durationMinutes: 140,
    rating: 8.5,
    isPremiere: true,
    isActive: true,
    genres: [{ id: 'g-action', name: 'Acción' }],
  };

  const comedyMovie = {
    id: 'movie-comedy',
    title: 'Risa Contagiosa',
    posterUrl: 'https://example.com/risa.jpg',
    classification: 'T',
    durationMinutes: 100,
    rating: 7.2,
    isPremiere: false,
    isActive: true,
    genres: [{ id: 'g-comedy', name: 'Comedia' }],
  };

  const seenMovie = {
    id: 'movie-seen',
    title: 'Ya Vista',
    posterUrl: 'https://example.com/seen.jpg',
    classification: '15+',
    durationMinutes: 110,
    rating: 9.0,
    isPremiere: false,
    isActive: true,
    genres: [{ id: 'g-action', name: 'Acción' }],
  };

  const fridayShow = new Date('2026-07-31T20:00:00.000Z'); // Friday

  function showtimeFor(
    movie: typeof actionMovie,
    overrides: Partial<{
      id: string;
      format: string;
      language: string;
      cinemaId: string;
      cinemaName: string;
      startsAt: Date;
    }> = {},
  ) {
    return {
      id: overrides.id ?? `st-${movie.id}`,
      movieId: movie.id,
      movie,
      startsAt: overrides.startsAt ?? fridayShow,
      format: overrides.format ?? 'IMAX',
      language: overrides.language ?? 'ES',
      isActive: true,
      room: {
        cinema: {
          id: overrides.cinemaId ?? 'cinema-1',
          name: overrides.cinemaName ?? 'Laureles',
          cityId: 'city-1',
          isActive: true,
        },
      },
    };
  }

  const defaultPrefs: RecommendationPreference = {
    id: 'pref-1',
    userId: 'user-1',
    allowPurchaseHistory: true,
    allowProfileSignals: true,
    recentlyViewedDays: 30,
    favoriteGenres: [],
    preferredFormats: [],
    preferredLanguages: [],
    preferredCinemaIds: [],
    preferredWeekdays: [],
    preferredHourFrom: null,
    preferredHourTo: null,
    createdAt: new Date('2026-07-30T00:00:00.000Z'),
    updatedAt: new Date('2026-07-30T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    cityRepo.findOne.mockResolvedValue({ id: 'city-1', name: 'Medellín' });
    preferenceRepo.findOne.mockResolvedValue({ ...defaultPrefs });
    feedRepo.findOne.mockResolvedValue(null);
    profileRepo.findOne.mockResolvedValue(null);
    orderRepo.find.mockResolvedValue([]);
    movieRepo.find.mockResolvedValue([]);
    showtimeQb.getMany.mockResolvedValue([
      showtimeFor(actionMovie),
      showtimeFor(comedyMovie, {
        id: 'st-comedy',
        format: '2D',
        cinemaId: 'cinema-2',
        cinemaName: 'Centro',
      }),
      showtimeFor(seenMovie, { id: 'st-seen', format: '2D' }),
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getRepositoryToken(RecommendationPreference), useValue: preferenceRepo },
        { provide: getRepositoryToken(RecommendationFeed), useValue: feedRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Movie), useValue: movieRepo },
        { provide: getRepositoryToken(Showtime), useValue: showtimeRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(RecommendationsService);
  });

  it('throws NotFoundException when city does not exist', async () => {
    cityRepo.findOne.mockResolvedValue(null);
    await expect(service.getFeed('user-1', 'bad-city')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('ranks by explicit favorite genres when no purchase history', async () => {
    preferenceRepo.findOne.mockResolvedValue({
      ...defaultPrefs,
      favoriteGenres: ['Acción'],
      preferredFormats: ['IMAX'],
    });

    const result = await service.getFeed('user-1', 'city-1');

    expect(result.fromCache).toBe(false);
    expect(result.recommendations[0].movieId).toBe('movie-action');
    expect(result.recommendations[0].reasons.some((r) =>
      r.detail.includes('Acción'),
    )).toBe(true);
    expect(result.signals.usedPurchaseHistory).toBe(false);
    expect(feedRepo.save).toHaveBeenCalled();
  });

  it('excludes recently purchased movies (RN-098)', async () => {
    const recent = new Date();
    recent.setUTCDate(recent.getUTCDate() - 2);

    orderRepo.find.mockResolvedValue([
      {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PAID,
        cinemaId: 'cinema-1',
        createdAt: recent,
        tickets: [
          {
            movieId: 'movie-seen',
            movieTitle: 'Ya Vista',
            startsAt: recent,
            format: 'IMAX',
            language: 'ES',
            cinemaName: 'Laureles',
          },
        ],
      },
    ]);
    movieRepo.find.mockResolvedValue([seenMovie]);

    const result = await service.getFeed('user-1', 'city-1');

    const ids = result.recommendations.map((r) => r.movieId);
    expect(ids).not.toContain('movie-seen');
    expect(result.signals.excludedRecentMovieIds).toContain('movie-seen');
    expect(result.signals.usedPurchaseHistory).toBe(true);
  });

  it('does not use purchase history when allowPurchaseHistory=false (RN-097)', async () => {
    preferenceRepo.findOne.mockResolvedValue({
      ...defaultPrefs,
      allowPurchaseHistory: false,
      favoriteGenres: ['Comedia'],
    });
    orderRepo.find.mockResolvedValue([
      {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PAID,
        cinemaId: 'cinema-1',
        tickets: [
          {
            movieId: 'movie-seen',
            startsAt: new Date(),
            format: 'IMAX',
            language: 'ES',
          },
        ],
      },
    ]);

    const result = await service.getFeed('user-1', 'city-1');

    expect(orderRepo.find).not.toHaveBeenCalled();
    expect(result.signals.usedPurchaseHistory).toBe(false);
    expect(result.recommendations[0].movieId).toBe('movie-comedy');
  });

  it('returns cached feed when computed today (RN-096)', async () => {
    const cachedItems = [
      {
        movieId: 'movie-action',
        title: 'Cached',
        posterUrl: 'x',
        genres: ['Acción'],
        classification: '12+',
        durationMinutes: 140,
        rating: 8.5,
        isPremiere: true,
        score: 10,
        reasons: [
          {
            source: RecommendationSignalSource.POPULARITY,
            detail: 'cached',
          },
        ],
        formats: ['IMAX'],
        languages: ['ES'],
        cinemas: [],
        nextShowtime: null,
      },
    ];
    feedRepo.findOne.mockResolvedValue({
      id: 'feed-1',
      userId: 'user-1',
      cityId: 'city-1',
      items: cachedItems,
      signals: {
        genres: ['accion'],
        formats: [],
        languages: [],
        cinemaIds: [],
        weekdays: [],
        hourFrom: null,
        hourTo: null,
        visitCount: 0,
        excludedRecentMovieIds: [],
        usedPurchaseHistory: false,
        usedProfileSignals: false,
      },
      computedAt: new Date(),
    });

    const result = await service.getFeed('user-1', 'city-1');

    expect(result.fromCache).toBe(true);
    expect(result.recommendations).toEqual(cachedItems);
    expect(showtimeRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('upserts preferences and invalidates feed', async () => {
    const result = await service.upsertPreferences('user-1', {
      allowPurchaseHistory: false,
      favoriteGenres: ['Terror'],
      recentlyViewedDays: 14,
    });

    expect(result.preferences.allowPurchaseHistory).toBe(false);
    expect(result.preferences.favoriteGenres).toEqual(['Terror']);
    expect(result.preferences.recentlyViewedDays).toBe(14);
    expect(result.feedInvalidated).toBe(true);
    expect(feedRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});
