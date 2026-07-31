/**
 * Tests unitarios de `CineflashService` (HU-019).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { EmailService } from '../notifications/email.service';
import { DiscountKind, PromotionType } from '../promotions/enums/promotion.enums';
import { Promotion } from '../promotions/entities/promotion.entity';
import {
  CINE_FLASH_DISCOUNT_PERCENT,
  CINE_FLASH_MAX_TICKETS,
} from './cineflash.constants';
import { CineflashService } from './cineflash.service';
import { CineFlashAudit } from './entities/cineflash-audit.entity';
import { CineFlashAuditAction } from './enums/cineflash.enums';

describe('CineflashService', () => {
  let service: CineflashService;

  const showtimeRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (x: Showtime) => x),
  };
  const promoRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Promotion) => ({
      ...x,
      id: (x as Promotion).id ?? 'promo-flash-1',
    })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn(),
  };
  const auditRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: unknown) => x),
    findOne: jest.fn(),
  };
  const userRepo = { find: jest.fn().mockResolvedValue([]) };
  const profileRepo = { find: jest.fn().mockResolvedValue([]) };
  const prefsRepo = { find: jest.fn().mockResolvedValue([]) };
  const emailService = {
    sendCineFlash: jest.fn().mockResolvedValue({}),
  };

  function makeShowtime(overrides: Partial<Showtime> = {}): Showtime {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    return {
      id: 'st-1',
      startsAt,
      format: '2D',
      language: 'ES',
      audioType: 'DUBBED',
      soldSeats: 10,
      price: 20000,
      maxSeatsPerOrder: 8,
      isActive: true,
      movieId: 'movie-1',
      roomId: 'room-1',
      movie: {
        id: 'movie-1',
        title: 'Flash Demo',
        posterUrl: 'https://example.com/p.jpg',
        bannerUrl: null,
      },
      room: {
        id: 'room-1',
        name: 'Sala 1',
        capacity: 100,
        cinema: {
          id: 'cine-1',
          name: 'Laureles',
          cityId: 'city-1',
        },
      },
      ...overrides,
    } as unknown as Showtime;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    promoRepo.find.mockResolvedValue([]);
    promoRepo.findOne.mockResolvedValue(null);
    profileRepo.find.mockResolvedValue([]);
    prefsRepo.find.mockResolvedValue([]);
    userRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CineflashService,
        { provide: getRepositoryToken(Showtime), useValue: showtimeRepo },
        { provide: getRepositoryToken(Promotion), useValue: promoRepo },
        { provide: getRepositoryToken(CineFlashAudit), useValue: auditRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: prefsRepo,
        },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(CineflashService);
  });

  it('activates Cine Flash when occupancy < 60% at ~1h (RN-080…083)', async () => {
    const showtime = makeShowtime({ soldSeats: 10 });
    showtimeRepo.createQueryBuilder.mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([showtime]),
    });

    const result = await service.process();

    expect(result.activated).toBe(1);
    expect(result.deactivated).toBe(0);
    expect(promoRepo.save).toHaveBeenCalled();
    const savedPromo = promoRepo.save.mock.calls[0][0] as Promotion;
    expect(savedPromo.type).toBe(PromotionType.CINE_FLASH);
    expect(savedPromo.discountKind).toBe(DiscountKind.PERCENT);
    expect(Number(savedPromo.discountValue)).toBe(CINE_FLASH_DISCOUNT_PERCENT);
    expect(savedPromo.stackable).toBe(false);
    expect(savedPromo.appliesToTickets).toBe(true);
    expect(savedPromo.appliesToSnacks).toBe(false);
    expect(savedPromo.requiresCode).toBe(false);
    expect(savedPromo.showtimeId).toBe('st-1');
    expect(showtime.maxSeatsPerOrder).toBe(CINE_FLASH_MAX_TICKETS);
    expect(auditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CineFlashAuditAction.ACTIVATED,
        previousMaxSeatsPerOrder: 8,
      }),
    );
  });

  it('skips activation when occupancy >= 60%', async () => {
    const showtime = makeShowtime({ soldSeats: 60 });
    showtimeRepo.createQueryBuilder.mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([showtime]),
    });

    const result = await service.process();

    expect(result.activated).toBe(0);
    expect(promoRepo.save).not.toHaveBeenCalled();
  });

  it('deactivates when showtime has started (RN-084)', async () => {
    const showtime = makeShowtime({
      startsAt: new Date(Date.now() - 60_000),
      soldSeats: 10,
      maxSeatsPerOrder: CINE_FLASH_MAX_TICKETS,
    });
    const activePromo = {
      id: 'promo-flash-1',
      type: PromotionType.CINE_FLASH,
      showtimeId: 'st-1',
      isActive: true,
      endsAt: showtime.startsAt,
    } as Promotion;

    promoRepo.find.mockResolvedValue([activePromo]);
    showtimeRepo.findOne.mockResolvedValue(showtime);
    showtimeRepo.createQueryBuilder.mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    auditRepo.findOne.mockResolvedValue({
      previousMaxSeatsPerOrder: 8,
    });

    const result = await service.process();

    expect(result.deactivated).toBe(1);
    expect(activePromo.isActive).toBe(false);
    expect(showtime.maxSeatsPerOrder).toBe(8);
  });

  it('lists active flash functions', async () => {
    const showtime = makeShowtime();
    const promo = {
      id: 'promo-flash-1',
      type: PromotionType.CINE_FLASH,
      showtimeId: 'st-1',
      isActive: true,
      code: 'FLASH-ST1',
      startsAt: new Date(Date.now() - 60_000),
      endsAt: showtime.startsAt,
    } as Promotion;

    promoRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([promo]),
    });
    showtimeRepo.createQueryBuilder.mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([showtime]),
    });

    const list = await service.listActive('city-1');

    expect(list.count).toBe(1);
    expect(list.items[0]?.badge).toBe('CINE_FLASH');
    expect(list.items[0]?.discountPercent).toBe(20);
    expect(list.items[0]?.flashPrice).toBe(16000);
    expect(list.items[0]?.maxTickets).toBe(3);
  });
});
