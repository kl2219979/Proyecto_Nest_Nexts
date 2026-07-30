/**
 * Tests unitarios de `CartService` (HU-011).
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MembershipLevel } from '../membership/enums/membership.enums';
import { MembershipService } from '../membership/membership.service';
import { Showtime } from '../movies/entities/showtime.entity';
import {
  AudioType,
  MovieFormat,
} from '../movies/enums/movie.enums';
import { SeatsService } from '../seats/seats.service';
import { CartService, CART_TAX_RATE } from './cart.service';
import { CartSnackItem } from './entities/cart-snack-item.entity';
import { CartTicketItem } from './entities/cart-ticket-item.entity';
import { Cart } from './entities/cart.entity';
import { CartStatus } from './enums/cart.enums';

describe('CartService', () => {
  let service: CartService;

  const cartRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Cart) => ({
      ...x,
      id: x.id ?? 'cart-1',
      createdAt: x.createdAt ?? new Date(),
      updatedAt: new Date(),
    })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const ticketRepo = {
    create: jest.fn((x: unknown) => x),
    remove: jest.fn(),
  };
  const snackRepo = {
    create: jest.fn((x: unknown) => x),
    remove: jest.fn(),
  };
  const showtimeRepo = {
    findOne: jest.fn(),
  };
  const seatsService = {
    listMyReservations: jest.fn(),
    extendReservationExpiry: jest.fn().mockResolvedValue(2),
    releaseSeats: jest.fn().mockResolvedValue({
      releasedCount: 2,
      reservationIds: ['res-1'],
    }),
    releaseSeatsByIds: jest.fn().mockResolvedValue(1),
  };
  const membershipService = {
    findByUserId: jest.fn(),
  };

  const futureStarts = new Date(Date.now() + 3 * 60 * 60 * 1000);

  const reservation = {
    reservationId: 'res-1',
    functionId: 'fn-1',
    movieId: 'movie-1',
    startsAt: futureStarts.toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    room: { id: 'room-1', name: 'Sala 1' },
    cinema: { id: 'cine-1', name: 'Laureles' },
    summary: {
      seatCount: 2,
      unitPrice: 20000,
      subtotal: 40000,
      currency: 'COP' as const,
      seats: [
        {
          id: 'seat-a',
          label: 'A1',
          seatType: 'STANDARD',
          unitPrice: 20000,
        },
        {
          id: 'seat-b',
          label: 'A2',
          seatType: 'STANDARD',
          unitPrice: 20000,
        },
      ],
    },
  };

  const showtime = {
    id: 'fn-1',
    movieId: 'movie-1',
    startsAt: futureStarts,
    format: MovieFormat.TWO_D,
    language: 'ES',
    audioType: AudioType.DUBBED,
    movie: { title: 'Demo Film' },
    room: {
      name: 'Sala 1',
      cinema: { name: 'Laureles' },
    },
  };

  /**
   * QueryBuilder vacío para expireOverdueCarts.
   */
  function mockEmptyExpireQb(): void {
    cartRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEmptyExpireQb();
    seatsService.listMyReservations.mockResolvedValue([reservation]);
    showtimeRepo.findOne.mockResolvedValue(showtime);
    membershipService.findByUserId.mockResolvedValue({
      level: MembershipLevel.BRONZE,
    });
    cartRepo.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepo },
        { provide: getRepositoryToken(CartTicketItem), useValue: ticketRepo },
        { provide: getRepositoryToken(CartSnackItem), useValue: snackRepo },
        { provide: getRepositoryToken(Showtime), useValue: showtimeRepo },
        { provide: SeatsService, useValue: seatsService },
        { provide: MembershipService, useValue: membershipService },
      ],
    }).compile();

    service = module.get(CartService);
  });

  it('create builds cart from seat reservation with membership discount', async () => {
    const result = await service.create('user-1');

    expect(result.reservationId).toBe('res-1');
    expect(result.tickets).toHaveLength(2);
    expect(result.membership.ticketDiscountPercent).toBe(5);
    expect(result.summary.ticketsSubtotal).toBe(40000);
    expect(result.summary.membershipDiscount).toBe(2000);
    const after = 40000 - 2000;
    expect(result.summary.tax).toBe(
      Math.round(after * CART_TAX_RATE * 100) / 100,
    );
    expect(seatsService.extendReservationExpiry).toHaveBeenCalled();
  });

  it('create throws when there are no seat locks', async () => {
    seatsService.listMyReservations.mockResolvedValue([]);
    await expect(service.create('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('create returns existing cart when same reservation is still active', async () => {
    const existing = {
      id: 'cart-1',
      userId: 'user-1',
      status: CartStatus.ACTIVE,
      reservationId: 'res-1',
      showtimeId: 'fn-1',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      lastActivityAt: new Date(),
      membershipDiscountApplied: true,
      promoCode: null,
      promoDiscountAmount: 0,
      promoStackable: null,
      giftcardCode: null,
      giftcardAmount: 0,
      tickets: [
        {
          id: 't1',
          seatId: 'seat-a',
          seatLabel: 'A1',
          movieId: 'movie-1',
          movieTitle: 'Demo Film',
          startsAt: futureStarts,
          roomName: 'Sala 1',
          cinemaName: 'Laureles',
          format: '2D',
          language: 'ES',
          unitPrice: 20000,
        },
      ],
      snacks: [],
      createdAt: new Date(),
    } as unknown as Cart;

    cartRepo.findOne.mockResolvedValue(existing);
    const result = await service.create('user-1');
    expect(result.id).toBe('cart-1');
    expect(cartRepo.create).not.toHaveBeenCalled();
  });

  it('applyPromo rejects non-stackable combination (RN-048)', async () => {
    const cart = {
      id: 'cart-1',
      userId: 'user-1',
      status: CartStatus.ACTIVE,
      reservationId: 'res-1',
      showtimeId: 'fn-1',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      lastActivityAt: new Date(),
      membershipDiscountApplied: true,
      promoCode: 'MULTICINE10',
      promoDiscountAmount: 10000,
      promoStackable: false,
      giftcardCode: null,
      giftcardAmount: 0,
      tickets: [],
      snacks: [],
      createdAt: new Date(),
    } as unknown as Cart;

    cartRepo.findOne.mockResolvedValue(cart);
    await expect(
      service.applyPromo('user-1', { code: 'SNACK5K' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('getActive throws NotFound when no cart', async () => {
    cartRepo.findOne.mockResolvedValue(null);
    await expect(service.getActive('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delete cancels cart and releases seats', async () => {
    const cart = {
      id: 'cart-1',
      userId: 'user-1',
      status: CartStatus.ACTIVE,
      reservationId: 'res-1',
      showtimeId: 'fn-1',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      lastActivityAt: new Date(),
      membershipDiscountApplied: true,
      promoCode: null,
      promoDiscountAmount: 0,
      promoStackable: null,
      giftcardCode: null,
      giftcardAmount: 0,
      tickets: [],
      snacks: [],
      createdAt: new Date(),
    } as unknown as Cart;

    cartRepo.findOne.mockResolvedValue(cart);
    const result = await service.delete('user-1');
    expect(result.status).toBe(CartStatus.CANCELLED);
    expect(result.seatsReleased).toBe(2);
    expect(seatsService.releaseSeats).toHaveBeenCalledWith('user-1', 'res-1');
  });
});
