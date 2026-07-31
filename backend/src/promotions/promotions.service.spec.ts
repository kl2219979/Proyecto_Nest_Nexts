/**
 * Tests unitarios de `PromotionsService` (HU-026).
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Membership } from '../membership/entities/membership.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { DiscountKind, PromotionType } from './enums/promotion.enums';
import { PromotionRedemption } from './entities/promotion-redemption.entity';
import { Promotion } from './entities/promotion.entity';
import { PromotionsService } from './promotions.service';

describe('PromotionsService', () => {
  let service: PromotionsService;

  const promoRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Promotion) => ({
      ...x,
      id: x.id ?? 'promo-1',
      createdAt: x.createdAt ?? new Date(),
      updatedAt: new Date(),
    })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };
  const redemptionRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: unknown) => x),
    count: jest.fn().mockResolvedValue(0),
  };
  const showtimeRepo = {
    createQueryBuilder: jest.fn(),
  };
  const membershipRepo = {
    findOne: jest.fn(),
  };
  const profileRepo = {
    findOne: jest.fn(),
  };

  const basePromo = (): Promotion =>
    ({
      id: 'promo-1',
      code: 'MULTICINE10',
      name: 'Descuento $10k',
      description: 'Demo',
      type: PromotionType.CUSTOM,
      discountKind: DiscountKind.FIXED,
      discountValue: 10000,
      stackable: false,
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 86400000 * 30),
      maxUsesPerUser: 2,
      maxTotalUses: null,
      isActive: true,
      requiresCode: true,
      cityId: null,
      cinemaId: null,
      roomId: null,
      movieId: null,
      genreId: null,
      format: null,
      appliesToTickets: true,
      appliesToSnacks: false,
      minMembershipLevel: null,
      birthdayWindowDays: 0,
      incompatibleWithPoints: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Promotion;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: getRepositoryToken(Promotion), useValue: promoRepo },
        {
          provide: getRepositoryToken(PromotionRedemption),
          useValue: redemptionRepo,
        },
        { provide: getRepositoryToken(Showtime), useValue: showtimeRepo },
        { provide: getRepositoryToken(Membership), useValue: membershipRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
      ],
    }).compile();
    service = module.get(PromotionsService);
  });

  it('create persists a coupon with normalized code', async () => {
    promoRepo.findOne.mockResolvedValue(null);
    const result = await service.create({
      code: '  multicine10  ',
      name: 'Descuento Multicine',
      type: PromotionType.CUSTOM,
      discountKind: DiscountKind.FIXED,
      discountValue: 10000,
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2026-12-31T23:59:59Z'),
      stackable: false,
    });
    expect(result.code).toBe('MULTICINE10');
    expect(result.discountValue).toBe(10000);
  });

  it('create rejects invalid date range (RN-106)', async () => {
    await expect(
      service.create({
        name: 'Bad',
        type: PromotionType.CUSTOM,
        discountKind: DiscountKind.FIXED,
        discountValue: 1000,
        startsAt: new Date('2026-12-01'),
        endsAt: new Date('2026-01-01'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applyCodeToCart returns fixed discount', async () => {
    promoRepo.findOne.mockResolvedValue(basePromo());
    const result = await service.applyCodeToCart(
      'MULTICINE10',
      {
        userId: 'user-1',
        ticketsSubtotal: 40000,
        snacksSubtotal: 0,
        ticketUnitPrices: [20000, 20000],
      },
    );
    expect(result.discountAmount).toBe(10000);
    expect(result.stackable).toBe(false);
  });

  it('applyCodeToCart rejects expired promo (RN-106)', async () => {
    const expired = basePromo();
    expired.endsAt = new Date(Date.now() - 1000);
    promoRepo.findOne.mockResolvedValue(expired);
    await expect(
      service.applyCodeToCart('MULTICINE10', {
        userId: 'user-1',
        ticketsSubtotal: 40000,
        snacksSubtotal: 0,
        ticketUnitPrices: [20000],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applyCodeToCart rejects non-stackable combo (RN-105)', async () => {
    promoRepo.findOne.mockResolvedValue({
      ...basePromo(),
      code: 'SNACK5K',
      stackable: true,
      appliesToTickets: false,
      appliesToSnacks: true,
      discountValue: 5000,
    });
    await expect(
      service.applyCodeToCart(
        'SNACK5K',
        {
          userId: 'user-1',
          ticketsSubtotal: 0,
          snacksSubtotal: 12000,
          ticketUnitPrices: [],
        },
        { code: 'MULTICINE10', discountAmount: 10000, stackable: false },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('applyCodeToCart enforces maxUsesPerUser (RN-107)', async () => {
    promoRepo.findOne.mockResolvedValue(basePromo());
    redemptionRepo.count.mockResolvedValue(2);
    await expect(
      service.applyCodeToCart('MULTICINE10', {
        userId: 'user-1',
        ticketsSubtotal: 40000,
        snacksSubtotal: 0,
        ticketUnitPrices: [20000],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('calculateDiscount supports TWO_FOR_ONE', () => {
    const promo = {
      ...basePromo(),
      discountKind: DiscountKind.TWO_FOR_ONE,
      discountValue: 0,
      appliesToTickets: true,
    } as Promotion;
    const amount = service.calculateDiscount(promo, {
      userId: 'u',
      ticketsSubtotal: 60000,
      snacksSubtotal: 0,
      ticketUnitPrices: [20000, 25000, 15000],
    });
    // 1 par → regala la más barata del set ordenado (15000)
    expect(amount).toBe(15000);
  });

  it('getById throws NotFound', async () => {
    promoRepo.findOne.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
