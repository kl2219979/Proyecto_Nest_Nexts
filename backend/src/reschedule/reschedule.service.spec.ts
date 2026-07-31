import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { MembershipService } from '../membership/membership.service';
import { ShowtimesService } from '../movies/showtimes.service';
import { OrderTicketItem } from '../payments/entities/order-ticket-item.entity';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { EmailService } from '../notifications/email.service';
import { SeatsService } from '../seats/seats.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket.enums';
import { TicketsService } from '../tickets/tickets.service';
import { RescheduleAudit } from './entities/reschedule-audit.entity';
import {
  RESCHEDULE_MIN_LEAD_MS,
  RescheduleService,
} from './reschedule.service';

describe('RescheduleService (HU-016)', () => {
  const userId = 'user-1';
  const orderId = 'order-1';
  const oldShowtimeId = 'st-old';
  const newShowtimeId = 'st-new';
  const movieId = 'movie-1';
  const startsFar = new Date(Date.now() + 5 * RESCHEDULE_MIN_LEAD_MS);

  const orderRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const ticketItemRepo = {
    delete: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
  };
  const ticketRepo = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const auditRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ ...x, id: 'audit-1' })),
  };
  const userRepo = {
    findOne: jest.fn().mockResolvedValue({ id: userId, email: 'a@b.com' }),
  };
  const seatsService = {
    getLockedReservation: jest.fn(),
    releaseSoldSeats: jest.fn().mockResolvedValue(1),
    confirmReservationSold: jest.fn().mockResolvedValue(1),
  };
  const showtimesService = {
    listFunctionsForMovie: jest.fn(),
  };
  const ticketsService = {
    cancelValidTicketsForOrder: jest.fn().mockResolvedValue(['tkt-old']),
    regenerateTicketsForOrder: jest.fn().mockResolvedValue({
      tickets: [
        {
          id: 'tkt-new',
          orderId,
          code: 'TKT-NEW',
          status: 'VALID',
        },
      ],
      invoice: { id: 'inv-1' },
    }),
  };
  const membershipService = {
    creditWallet: jest.fn().mockResolvedValue('1500.00'),
    debitWallet: jest.fn().mockResolvedValue('0.00'),
  };
  const emailService = {
    sendFunctionChanged: jest.fn().mockResolvedValue({}),
  };

  let service: RescheduleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RescheduleService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        {
          provide: getRepositoryToken(OrderTicketItem),
          useValue: ticketItemRepo,
        },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepo },
        {
          provide: getRepositoryToken(RescheduleAudit),
          useValue: auditRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: SeatsService, useValue: seatsService },
        { provide: ShowtimesService, useValue: showtimesService },
        { provide: TicketsService, useValue: ticketsService },
        { provide: MembershipService, useValue: membershipService },
        { provide: EmailService, useValue: emailService },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (fn: (m: unknown) => Promise<unknown>) =>
              fn({
                getRepository: (entity: unknown) => {
                  if (entity === OrderTicketItem) return ticketItemRepo;
                  if (entity === Order) return orderRepo;
                  return {};
                },
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(RescheduleService);
  });

  function paidOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: orderId,
      userId,
      status: OrderStatus.PAID,
      showtimeId: oldShowtimeId,
      reservationId: 'res-old',
      ticketsSubtotal: 20000,
      snacksSubtotal: 0,
      membershipDiscount: 0,
      promoDiscount: 0,
      giftcardAmount: 0,
      tax: 0,
      total: 20000,
      cinemaId: 'cin-1',
      cinemaName: 'Multicine Demo',
      currency: 'COP',
      tickets: [
        {
          id: 'line-1',
          orderId,
          seatId: 'seat-old',
          seatLabel: 'A1',
          movieId,
          movieTitle: 'Demo',
          startsAt: startsFar,
          roomName: 'Sala 1',
          cinemaName: 'Multicine Demo',
          format: '2D',
          language: 'ES',
          unitPrice: 20000,
          membershipDiscount: 0,
          lineTotal: 20000,
        } as OrderTicketItem,
      ],
      createdAt: new Date(),
      ...overrides,
    } as Order;
  }

  it('listPaidOrders marca canReschedule según RN-065', async () => {
    orderRepo.find.mockResolvedValue([paidOrder()]);
    ticketRepo.find.mockResolvedValue([
      { id: 't1', status: TicketStatus.VALID },
    ]);

    const result = await service.listPaidOrders(userId);
    expect(result.total).toBe(1);
    expect(result.items[0]!.canReschedule).toBe(true);
    expect(result.items[0]!.orderId).toBe(orderId);
  });

  it('listPaidOrders bloquea si falta menos de 1 hora (RN-065)', async () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000);
    orderRepo.find.mockResolvedValue([
      paidOrder({
        tickets: [
          {
            ...(paidOrder().tickets![0] as OrderTicketItem),
            startsAt: soon,
          },
        ],
      }),
    ]);
    ticketRepo.find.mockResolvedValue([{ id: 't1' }]);

    const result = await service.listPaidOrders(userId);
    expect(result.items[0]!.canReschedule).toBe(false);
    expect(result.items[0]!.rescheduleBlockedReason).toMatch(/1 hora/);
  });

  it('listAvailableFunctions excluye la función actual', async () => {
    orderRepo.findOne.mockResolvedValue(paidOrder());
    ticketRepo.count.mockResolvedValue(1);
    showtimesService.listFunctionsForMovie.mockResolvedValue({
      movieId,
      cityId: 'city-1',
      functions: [
        { id: oldShowtimeId, startsAt: startsFar.toISOString() },
        { id: newShowtimeId, startsAt: startsFar.toISOString() },
      ],
      facets: {},
    });

    const result = await service.listAvailableFunctions(
      userId,
      orderId,
      'city-1',
    );
    expect(result.functions.functions).toHaveLength(1);
    expect(result.functions.functions[0]!.id).toBe(newShowtimeId);
  });

  it('reschedule cancela QR, libera SOLD, regenera y audita', async () => {
    orderRepo.findOne.mockResolvedValue(paidOrder());
    ticketRepo.find.mockResolvedValue([{ id: 't-old' }]);
    ticketRepo.count.mockResolvedValue(0);
    seatsService.getLockedReservation.mockResolvedValue([
      {
        seatId: 'seat-new',
        showtimeId: newShowtimeId,
        seat: { label: 'B2' },
        showtime: {
          id: newShowtimeId,
          movieId,
          isActive: true,
          startsAt: startsFar,
          price: 18000,
          format: '2D',
          language: 'ES',
          room: {
            name: 'Sala 2',
            cinemaId: 'cin-1',
            cinema: { name: 'Multicine Demo' },
          },
          movie: { title: 'Demo' },
        },
      },
    ]);

    const result = await service.reschedule(userId, orderId, {
      newShowtimeId,
      reservationId: 'res-new',
    });

    expect(ticketsService.cancelValidTicketsForOrder).toHaveBeenCalledWith(
      orderId,
      userId,
    );
    expect(seatsService.releaseSoldSeats).toHaveBeenCalled();
    expect(seatsService.confirmReservationSold).toHaveBeenCalledWith(
      userId,
      'res-new',
      ['seat-new'],
    );
    expect(ticketsService.regenerateTicketsForOrder).toHaveBeenCalled();
    expect(membershipService.creditWallet).toHaveBeenCalledWith(userId, 2000);
    expect(emailService.sendFunctionChanged).toHaveBeenCalled();
    expect(result.auditId).toBe('audit-1');
    expect(result.cancelledTicketIds).toEqual(['tkt-old']);
    expect(result.creditApplied).toBe(2000);
  });

  it('reschedule rechaza si la función ya inició (RN-067)', async () => {
    const past = new Date(Date.now() - 60_000);
    orderRepo.findOne.mockResolvedValue(
      paidOrder({
        tickets: [
          {
            ...(paidOrder().tickets![0] as OrderTicketItem),
            startsAt: past,
          },
        ],
      }),
    );
    ticketRepo.find.mockResolvedValue([{ id: 't1' }]);

    await expect(
      service.reschedule(userId, orderId, {
        newShowtimeId,
        reservationId: 'res-new',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
