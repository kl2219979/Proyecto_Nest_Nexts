/**
 * Tests unitarios de `NotificationsService` (HU-005).
 */
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { MovieStatus } from '../movies/enums/movie.enums';
import {
  UpcomingNotification,
  UpcomingNotificationStatus,
} from './entities/upcoming-notification.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const notificationRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(UpcomingNotification),
          useValue: notificationRepo,
        },
        { provide: getRepositoryToken(Movie), useValue: movieRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  /**
   * Alta feliz de aviso de estreno.
   *
   * @returns {Promise<void>}
   */
  it('subscribeUpcoming creates a PENDING notification', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    movieRepo.findOne.mockResolvedValue({
      id: 'm-1',
      status: MovieStatus.UPCOMING,
      isActive: true,
    });
    notificationRepo.findOne.mockResolvedValue(null);
    notificationRepo.create.mockImplementation((row: unknown) => row);
    notificationRepo.save.mockResolvedValue({
      id: 'n-1',
      userId: '00000000-0000-4000-8000-000000000099',
      email: 'user@example.com',
      movieId: 'm-1',
      cityId: 'city-1',
      status: UpcomingNotificationStatus.PENDING,
      createdAt: new Date('2026-07-30T12:00:00Z'),
    });

    const result = await service.subscribeUpcoming({
      userId: '00000000-0000-4000-8000-000000000099',
      email: 'User@Example.com',
      movieId: 'm-1',
      cityId: 'city-1',
    });

    expect(result.id).toBe('n-1');
    expect(result.status).toBe(UpcomingNotificationStatus.PENDING);
    expect(notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com' }),
    );
  });

  /**
   * RN-019: no duplicar userId + movieId.
   *
   * @returns {Promise<void>}
   */
  it('subscribeUpcoming rejects duplicates (RN-019)', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    movieRepo.findOne.mockResolvedValue({
      id: 'm-1',
      status: MovieStatus.UPCOMING,
    });
    notificationRepo.findOne.mockResolvedValue({ id: 'existing' });

    await expect(
      service.subscribeUpcoming({
        userId: '00000000-0000-4000-8000-000000000099',
        email: 'user@example.com',
        movieId: 'm-1',
        cityId: 'city-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  /**
   * Solo se suscribe a películas UPCOMING.
   *
   * @returns {Promise<void>}
   */
  it('subscribeUpcoming rejects NOW_SHOWING movies', async () => {
    cityRepo.findOne.mockResolvedValue({ id: 'city-1' });
    movieRepo.findOne.mockResolvedValue({
      id: 'm-1',
      status: MovieStatus.NOW_SHOWING,
    });

    await expect(
      service.subscribeUpcoming({
        userId: '00000000-0000-4000-8000-000000000099',
        email: 'user@example.com',
        movieId: 'm-1',
        cityId: 'city-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  /**
   * RN-020: marca pendientes como SENT.
   *
   * @returns {Promise<void>}
   */
  it('dispatchUpcomingForMovie marks PENDING as SENT', async () => {
    const pending = [
      {
        id: 'n-1',
        userId: 'u-1',
        email: 'a@a.com',
        movieId: 'm-1',
        cityId: 'c-1',
        status: UpcomingNotificationStatus.PENDING,
        notifiedAt: null,
      },
      {
        id: 'n-2',
        userId: 'u-2',
        email: 'b@b.com',
        movieId: 'm-1',
        cityId: 'c-1',
        status: UpcomingNotificationStatus.PENDING,
        notifiedAt: null,
      },
    ];
    notificationRepo.find.mockResolvedValue(pending);
    notificationRepo.save.mockResolvedValue(pending);

    const result = await service.dispatchUpcomingForMovie('m-1');

    expect(result.notifiedCount).toBe(2);
    expect(pending[0].status).toBe(UpcomingNotificationStatus.SENT);
    expect(pending[0].notifiedAt).toBeInstanceOf(Date);
    expect(notificationRepo.save).toHaveBeenCalledWith(pending);
  });
});
