/**
 * Tests unitarios de `PaymentsService` (HU-013).
 */
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../notifications/email.service';
import { PromotionsService } from '../promotions/promotions.service';
import { GiftcardsService } from '../giftcards/giftcards.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { SeatsService } from '../seats/seats.service';
import { SnacksService } from '../snacks/snacks.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { OrderSnackItem } from './entities/order-snack-item.entity';
import { OrderTicketItem } from './entities/order-ticket-item.entity';
import { Order } from './entities/order.entity';
import { PaymentAudit } from './entities/payment-audit.entity';
import { Payment } from './entities/payment.entity';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './enums/payment.enums';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const orderRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Order) => ({
      ...x,
      id: x.id ?? 'order-1',
      createdAt: x.createdAt ?? new Date(),
      updatedAt: new Date(),
    })),
    update: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  const paymentRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Payment) => ({
      ...x,
      id: x.id ?? 'pay-1',
      createdAt: x.createdAt ?? new Date(),
      updatedAt: new Date(),
    })),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
  };
  const auditRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(),
  };
  const ticketItemRepo = {
    create: jest.fn((x: unknown) => x),
  };
  const snackItemRepo = {
    create: jest.fn((x: unknown) => x),
  };

  const cartView = {
    id: 'cart-1',
    status: 'ACTIVE',
    reservationId: 'res-1',
    showtimeId: 'fn-1',
    pickup: { cinemaId: 'cine-1', cinemaName: 'Laureles' },
    expiresAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    membershipDiscountApplied: true,
    membership: {
      level: null,
      ticketDiscountPercent: 0,
      snackDiscountPercent: 0,
    },
    promo: { code: null, discountAmount: 0, stackable: null },
    giftcard: { code: null, amount: 0 },
    points: { redeemed: 0, discountAmount: 0 },
    tickets: [
      {
        id: 'ct-1',
        seatId: 'seat-a',
        seatLabel: 'A1',
        movieId: 'm-1',
        movieTitle: 'Demo',
        startsAt: new Date().toISOString(),
        roomName: 'Sala 1',
        cinemaName: 'Laureles',
        format: '2D',
        language: 'ESP',
        unitPrice: 20000,
        membershipDiscount: 0,
        lineTotal: 20000,
      },
    ],
    snacks: [
      {
        id: 'cs-1',
        snackId: 'snack-1',
        name: 'Crispetas',
        imageUrl: null,
        quantity: 1,
        unitPrice: 12000,
        membershipDiscount: 0,
        lineTotal: 12000,
      },
    ],
    summary: {
      currency: 'COP' as const,
      ticketsSubtotal: 20000,
      snacksSubtotal: 12000,
      subtotal: 32000,
      membershipDiscount: 0,
      promoDiscount: 0,
      giftcardAmount: 0,
      pointsDiscountAmount: 0,
      tax: 6080,
      taxRate: 0.19,
      total: 38080,
      seatCount: 1,
      snackCount: 1,
    },
    createdAt: new Date().toISOString(),
  };

  const cartService = {
    prepareForPayment: jest.fn().mockResolvedValue({
      cart: {
        id: 'cart-1',
        reservationId: 'res-1',
        userId: 'user-1',
      },
      view: cartView,
    }),
    markCheckout: jest.fn(),
    markCompleted: jest.fn(),
    failCheckout: jest.fn().mockResolvedValue(1),
  };

  const seatsService = {
    assertReservationHeld: jest.fn(),
    confirmReservationSold: jest.fn().mockResolvedValue(1),
  };

  const snacksService = {
    decrementStock: jest.fn().mockResolvedValue(1),
  };

  const ticketsService = {
    fulfillPaidOrder: jest.fn().mockResolvedValue({
      tickets: [
        {
          id: 'tkt-1',
          movieTitle: 'Demo',
          startsAt: '2026-08-01T20:00:00.000Z',
        },
      ],
      invoice: { id: 'inv-1' },
    }),
  };

  const gateway = {
    createCharge: jest.fn().mockReturnValue({
      gatewayReference: 'gw_test',
      checkoutUrl: 'http://localhost:3000/payments/checkout-demo?ref=gw_test',
      encryptedPayload: 'iv:tag:cipher',
    }),
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };

  const userRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'demo@multicine.test',
    }),
  };

  const emailService = {
    sendPurchaseSuccess: jest.fn().mockResolvedValue({}),
    sendPaymentRejected: jest.fn().mockResolvedValue({}),
  };
  const promotionsService = {
    recordRedemptions: jest.fn().mockResolvedValue(undefined),
  };
  const giftcardsService = {
    consumeForOrder: jest.fn().mockResolvedValue(undefined),
  };

  const loyaltyService = {
    consumeForOrder: jest.fn().mockResolvedValue(undefined),
    earnForOrder: jest.fn().mockResolvedValue(32),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    paymentRepo.findOne.mockResolvedValue(null);
    orderRepo.findOneOrFail = jest.fn().mockImplementation(async () => ({
      id: 'order-1',
      total: 38080.5,
      currency: 'COP',
      ticketsGenerated: true,
      invoiceGenerated: true,
      tickets: [],
      snacks: [],
      createdAt: new Date(),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(PaymentAudit), useValue: auditRepo },
        {
          provide: getRepositoryToken(OrderTicketItem),
          useValue: ticketItemRepo,
        },
        {
          provide: getRepositoryToken(OrderSnackItem),
          useValue: snackItemRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: CartService, useValue: cartService },
        { provide: SeatsService, useValue: seatsService },
        { provide: SnacksService, useValue: snacksService },
        { provide: TicketsService, useValue: ticketsService },
        { provide: PaymentGatewayService, useValue: gateway },
        { provide: EmailService, useValue: emailService },
        { provide: PromotionsService, useValue: promotionsService },
        { provide: GiftcardsService, useValue: giftcardsService },
        { provide: LoyaltyService, useValue: loyaltyService },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('crea pago PENDING y marca carrito CHECKOUT', async () => {
    const dto: CreatePaymentDto = {
      method: PaymentMethod.CREDIT_CARD,
      paymentMethodToken: 'tok_demo_visa',
      idempotencyKey: 'idem-00123456',
    };

    const result = await service.create('user-1', dto);

    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.gatewayReference).toBe('gw_test');
    expect(result.fulfillment.tickets).toBe('SKIPPED');
    expect(cartService.markCheckout).toHaveBeenCalled();
    expect(gateway.createCharge).toHaveBeenCalled();
    expect(auditRepo.save).toHaveBeenCalled();
  });

  it('exige token para tarjeta', async () => {
    await expect(
      service.create('user-1', { method: PaymentMethod.CREDIT_CARD }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza pago duplicado sobre la misma reserva (RN-056)', async () => {
    paymentRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'pay-old',
        status: PaymentStatus.PENDING,
        reservationId: 'res-1',
      });

    await expect(
      service.create('user-1', {
        method: PaymentMethod.NEQUI,
        idempotencyKey: 'idem-unique-99',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('replay de idempotencyKey devuelve el mismo pago', async () => {
    const existing = {
      id: 'pay-1',
      userId: 'user-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.PSE,
      amount: 38080,
      currency: 'COP',
      idempotencyKey: 'idem-00123456',
      gatewayReference: 'gw_prev',
      confirmedAt: null,
      createdAt: new Date(),
      order: {
        id: 'order-1',
        status: OrderStatus.PENDING,
        currency: 'COP',
        ticketsSubtotal: 20000,
        snacksSubtotal: 12000,
        subtotal: 32000,
        membershipDiscount: 0,
        promoDiscount: 0,
        giftcardAmount: 0,
        giftcardCode: null,
        pointsRedeemed: 0,
        pointsDiscountAmount: 0,
        pointsEarned: 0,
        tax: 6080,
        total: 38080,
        promoCode: null,
        cinemaId: 'cine-1',
        cinemaName: 'Laureles',
        ticketsGenerated: false,
        invoiceGenerated: false,
        tickets: [],
        snacks: [],
        createdAt: new Date(),
      },
    };
    paymentRepo.findOne.mockResolvedValueOnce(existing);

    const result = await service.create('user-1', {
      method: PaymentMethod.PSE,
      idempotencyKey: 'idem-00123456',
    });

    expect(result.id).toBe('pay-1');
    expect(cartService.prepareForPayment).not.toHaveBeenCalled();
  });

  it('webhook APPROVED confirma sillas y stock (RN-053)', async () => {
    const payment = {
      id: 'pay-1',
      orderId: 'order-1',
      userId: 'user-1',
      cartId: 'cart-1',
      reservationId: 'res-1',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.NEQUI,
      amount: 38080,
      currency: 'COP',
      idempotencyKey: 'idem-x',
      gatewayReference: 'gw_test',
      confirmedAt: null,
      createdAt: new Date(),
      order: {
        id: 'order-1',
        status: OrderStatus.PENDING,
        currency: 'COP',
        ticketsSubtotal: 20000,
        snacksSubtotal: 12000,
        subtotal: 32000,
        membershipDiscount: 0,
        promoDiscount: 0,
        giftcardAmount: 0,
        giftcardCode: null,
        pointsRedeemed: 0,
        pointsDiscountAmount: 0,
        pointsEarned: 0,
        tax: 6080,
        total: 38080,
        promoCode: null,
        cinemaId: 'cine-1',
        cinemaName: 'Laureles',
        ticketsGenerated: false,
        invoiceGenerated: false,
        tickets: [
          {
            seatId: 'seat-a',
            seatLabel: 'A1',
            movieTitle: 'Demo',
            startsAt: new Date(),
            roomName: 'Sala 1',
            cinemaName: 'Laureles',
            format: '2D',
            unitPrice: 20000,
            lineTotal: 20000,
          },
        ],
        snacks: [
          {
            snackId: 'snack-1',
            name: 'Crispetas',
            quantity: 1,
            unitPrice: 12000,
            lineTotal: 12000,
          },
        ],
        createdAt: new Date(),
      },
    };
    paymentRepo.findOne.mockResolvedValue(payment);
    paymentRepo.findOneOrFail.mockResolvedValue({
      ...payment,
      status: PaymentStatus.APPROVED,
      confirmedAt: new Date(),
      order: {
        ...payment.order,
        status: OrderStatus.PAID,
        ticketsGenerated: true,
        invoiceGenerated: true,
      },
    });
    orderRepo.findOneOrFail.mockResolvedValue({
      ...payment.order,
      status: OrderStatus.PAID,
      ticketsGenerated: true,
      invoiceGenerated: true,
    });

    const result = await service.handleWebhook(
      {
        gatewayReference: 'gw_test',
        status: PaymentStatus.APPROVED,
      },
      'valid-sig',
    );

    expect(result.accepted).toBe(true);
    expect(seatsService.confirmReservationSold).toHaveBeenCalled();
    expect(snacksService.decrementStock).toHaveBeenCalled();
    expect(ticketsService.fulfillPaidOrder).toHaveBeenCalledWith('order-1');
    expect(cartService.markCompleted).toHaveBeenCalledWith('cart-1', 'user-1');
    expect(result.payment.fulfillment.tickets).toBe('GENERATED');
    expect(result.payment.fulfillment.invoice).toBe('GENERATED');
  });

  it('webhook REJECTED libera sillas (RN-054)', async () => {
    const payment = {
      id: 'pay-1',
      orderId: 'order-1',
      userId: 'user-1',
      cartId: 'cart-1',
      reservationId: 'res-1',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.PSE,
      amount: 1000,
      currency: 'COP',
      idempotencyKey: 'idem-y',
      gatewayReference: 'gw_fail',
      confirmedAt: null,
      createdAt: new Date(),
      order: {
        id: 'order-1',
        status: OrderStatus.PENDING,
        currency: 'COP',
        ticketsSubtotal: 1000,
        snacksSubtotal: 0,
        subtotal: 1000,
        membershipDiscount: 0,
        promoDiscount: 0,
        giftcardAmount: 0,
        giftcardCode: null,
        pointsRedeemed: 0,
        pointsDiscountAmount: 0,
        pointsEarned: 0,
        tax: 0,
        total: 1000,
        promoCode: null,
        cinemaId: null,
        cinemaName: null,
        ticketsGenerated: false,
        invoiceGenerated: false,
        tickets: [],
        snacks: [],
        createdAt: new Date(),
      },
    };
    paymentRepo.findOne.mockResolvedValue(payment);
    paymentRepo.findOneOrFail.mockResolvedValue({
      ...payment,
      status: PaymentStatus.REJECTED,
      confirmedAt: new Date(),
    });

    const result = await service.handleWebhook(
      { gatewayReference: 'gw_fail', status: PaymentStatus.REJECTED },
      'sig',
    );

    expect(cartService.failCheckout).toHaveBeenCalled();
    expect(result.message).toContain('RN-054');
  });

  it('webhook con firma inválida lanza Unauthorized (RN-053)', async () => {
    paymentRepo.findOne.mockResolvedValue({
      id: 'pay-1',
      gatewayReference: 'gw_test',
      amount: 10,
      status: PaymentStatus.PENDING,
      order: { id: 'o1', tickets: [], snacks: [], createdAt: new Date() },
    });
    gateway.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleWebhook(
        { gatewayReference: 'gw_test', status: PaymentStatus.APPROVED },
        'bad',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
