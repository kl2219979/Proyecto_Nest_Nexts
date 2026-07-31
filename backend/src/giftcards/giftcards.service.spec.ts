/**
 * Tests unitarios de `GiftcardsService` (HU-018).
 */
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { MembershipService } from '../membership/membership.service';
import { EmailService } from '../notifications/email.service';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import {
  PaymentMethod,
  PaymentStatus,
} from '../payments/enums/payment.enums';
import { Giftcard } from './entities/giftcard.entity';
import { GiftcardStatus, GiftcardTheme } from './enums/giftcard.enums';
import { GiftcardsService } from './giftcards.service';

describe('GiftcardsService', () => {
  let service: GiftcardsService;

  const giftcardRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Giftcard) => ({
      ...x,
      id: x.id ?? 'gc-1',
      createdAt: x.createdAt ?? new Date(),
      updatedAt: new Date(),
    })),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const userRepo = {
    findOne: jest.fn(),
  };
  const gateway = {
    createCharge: jest.fn().mockReturnValue({
      gatewayReference: 'gw_gift_1',
      checkoutUrl: 'http://localhost/checkout?ref=gw_gift_1',
      encryptedPayload: 'iv:tag:data',
    }),
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };
  const emailService = {
    sendGiftcard: jest.fn().mockResolvedValue({}),
  };
  const membershipService = {
    creditWallet: jest.fn().mockResolvedValue('50000.00'),
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'APP_PUBLIC_URL') return 'http://localhost:3000';
      if (key === 'GIFTCARD_EXPIRY_DAYS') return 365;
      return undefined;
    }),
  };

  const baseGiftcard = (): Giftcard =>
    ({
      id: 'gc-1',
      code: 'MCGC-AABBCCDD',
      qrPayload: 'MCGCQR-MCGC-AABBCCDD',
      purchaserUserId: 'user-1',
      recipientName: 'Ana',
      recipientEmail: 'ana@example.com',
      message: 'Feliz cumpleaños',
      theme: GiftcardTheme.BIRTHDAY,
      faceValue: 50_000,
      remainingBalance: 50_000,
      allowPartialUse: true,
      status: GiftcardStatus.PENDING_PAYMENT,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      scheduledSendAt: null,
      sentAt: null,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      idempotencyKey: 'idem-gc-00123456',
      gatewayReference: 'gw_gift_1',
      paymentMethodToken: 'tok_demo',
      encryptedPayload: 'iv:tag:data',
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Giftcard;

  beforeEach(async () => {
    jest.clearAllMocks();
    giftcardRepo.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftcardsService,
        { provide: getRepositoryToken(Giftcard), useValue: giftcardRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: PaymentGatewayService, useValue: gateway },
        { provide: EmailService, useValue: emailService },
        { provide: MembershipService, useValue: membershipService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(GiftcardsService);
  });

  it('purchase crea bono PENDING_PAYMENT con checkout', async () => {
    const result = await service.purchase('user-1', {
      amount: 50_000,
      recipientName: 'Ana',
      recipientEmail: 'ana@example.com',
      message: 'Feliz cumpleaños',
      theme: GiftcardTheme.BIRTHDAY,
      method: PaymentMethod.CREDIT_CARD,
      paymentMethodToken: 'tok_demo_visa',
      idempotencyKey: 'idem-gc-00123456',
    });

    expect(result.giftcard.status).toBe(GiftcardStatus.PENDING_PAYMENT);
    expect(result.payment.gatewayReference).toBe('gw_gift_1');
    expect(result.payment.checkoutUrl).toContain('gw_gift_1');
    expect(giftcardRepo.save).toHaveBeenCalled();
  });

  it('purchase rechaza tarjeta sin token', async () => {
    await expect(
      service.purchase('user-1', {
        amount: 20_000,
        recipientName: 'Ana',
        recipientEmail: 'ana@example.com',
        method: PaymentMethod.CREDIT_CARD,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('webhook APPROVED activa bono y envía correo', async () => {
    const gc = baseGiftcard();
    giftcardRepo.findOne.mockResolvedValue(gc);
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'buyer@example.com',
    });

    const result = await service.handleWebhook(
      {
        gatewayReference: 'gw_gift_1',
        status: PaymentStatus.APPROVED,
      },
      'sig',
    );

    expect(result.giftcard.status).toBe(GiftcardStatus.ACTIVE);
    expect(emailService.sendGiftcard).toHaveBeenCalled();
    expect(gc.sentAt).toBeTruthy();
  });

  it('webhook con firma inválida lanza Unauthorized', async () => {
    giftcardRepo.findOne.mockResolvedValue(baseGiftcard());
    gateway.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleWebhook(
        { gatewayReference: 'gw_gift_1', status: PaymentStatus.APPROVED },
        'bad',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('redeemToWallet acredita saldo parcial (RN-077)', async () => {
    const gc = baseGiftcard();
    gc.status = GiftcardStatus.ACTIVE;
    giftcardRepo.findOne.mockResolvedValue(gc);

    const result = await service.redeemToWallet('user-2', {
      code: 'MCGC-AABBCCDD',
      amount: 20_000,
    });

    expect(result.creditedAmount).toBe(20_000);
    expect(result.giftcard.remainingBalance).toBe(30_000);
    expect(membershipService.creditWallet).toHaveBeenCalledWith(
      'user-2',
      20_000,
    );
  });

  it('previewForCart respeta allowPartialUse=false', async () => {
    const gc = baseGiftcard();
    gc.status = GiftcardStatus.ACTIVE;
    gc.allowPartialUse = false;
    giftcardRepo.findOne.mockResolvedValue(gc);

    await expect(
      service.previewForCart('MCGC-AABBCCDD', 30_000),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('consumeForOrder debita y marca REDEEMED si saldo 0', async () => {
    const gc = baseGiftcard();
    gc.status = GiftcardStatus.ACTIVE;
    gc.remainingBalance = 15_000;
    giftcardRepo.findOne.mockResolvedValue(gc);

    await service.consumeForOrder('MCGC-AABBCCDD', 15_000);

    expect(gc.remainingBalance).toBe(0);
    expect(gc.status).toBe(GiftcardStatus.REDEEMED);
  });
});
