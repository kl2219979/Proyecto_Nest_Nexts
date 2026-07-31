/**
 * Tests unitarios de `EmailService` (HU-015).
 */
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { EmailGatewayService } from './email-gateway.service';
import { EmailService } from './email.service';
import { EmailNotification } from './entities/email-notification.entity';
import {
  EmailNotificationStatus,
  EmailTemplate,
} from './enums/email-notification.enums';

describe('EmailService', () => {
  let service: EmailService;

  const emailRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((row: unknown) => row),
    save: jest.fn(async (row: Record<string, unknown>) => ({
      id: 'mail-1',
      createdAt: new Date('2026-07-30T12:00:00Z'),
      ...row,
    })),
  };
  const prefsRepo = { findOne: jest.fn(), save: jest.fn() };
  const profileRepo = {
    findOne: jest.fn().mockResolvedValue({
      firstName: 'Ana',
      lastName: 'García',
    }),
  };
  const gateway = { send: jest.fn().mockResolvedValue({ providerMessageId: 'p1' }) };
  const config = {
    get: jest.fn((_k: string, fb?: string) => fb ?? 'http://localhost:3000'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    gateway.send.mockReset();
    gateway.send.mockResolvedValue({ providerMessageId: 'p1' });
    prefsRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      emailTransactional: true,
      emailMarketing: false,
      emailUpcoming: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: getRepositoryToken(EmailNotification), useValue: emailRepo },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: prefsRepo,
        },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        { provide: EmailGatewayService, useValue: gateway },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(EmailService);
  });

  it('enqueueAndSend marca SENT tras éxito del gateway', async () => {
    const row = await service.enqueueAndSend({
      userId: 'user-1',
      toEmail: 'ana@example.com',
      template: EmailTemplate.PROFILE_UPDATED,
    });

    expect(gateway.send).toHaveBeenCalled();
    expect(row.status).toBe(EmailNotificationStatus.SENT);
    expect(row.attemptCount).toBe(1);
  });

  it('reintenta hasta 3 veces y marca FAILED (RN-063)', async () => {
    gateway.send.mockRejectedValue(new Error('smtp down'));

    const row = await service.enqueueAndSend({
      userId: 'user-1',
      toEmail: 'ana@example.com',
      template: EmailTemplate.PASSWORD_CHANGED,
    });

    expect(gateway.send).toHaveBeenCalledTimes(3);
    expect(row.status).toBe(EmailNotificationStatus.FAILED);
    expect(row.attemptCount).toBe(3);
    expect(row.lastError).toContain('smtp down');
  });

  it('omite marketing si emailMarketing=false (RN-062)', async () => {
    const row = await service.enqueueAndSend({
      userId: 'user-1',
      toEmail: 'ana@example.com',
      template: EmailTemplate.PROMOTION,
      payload: { message: 'Promo demo' },
    });

    expect(gateway.send).not.toHaveBeenCalled();
    expect(row.status).toBe(EmailNotificationStatus.SKIPPED);
  });

  it('siempre envía transaccionales aunque marketing esté off', async () => {
    const row = await service.sendPurchaseSuccess({
      userId: 'user-1',
      email: 'ana@example.com',
      orderId: '00000000-0000-4000-8000-0000000000aa',
      invoiceId: '00000000-0000-4000-8000-0000000000bb',
      movieTitle: 'Demo',
      startsAt: '2026-08-01T20:00:00.000Z',
      total: '50000.00 COP',
    });

    expect(gateway.send).toHaveBeenCalled();
    expect(row.status).toBe(EmailNotificationStatus.SENT);
    expect(row.template).toBe(EmailTemplate.PURCHASE_SUCCESS);
  });
});
