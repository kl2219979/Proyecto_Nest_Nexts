/**
 * Tests unitarios de `PqrsService` (HU-028).
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user.enums';
import { Cinema } from '../locations/entities/cinema.entity';
import { EmailService } from '../notifications/email.service';
import { Order } from '../payments/entities/order.entity';
import { CreatePqrsDto } from './dto/create-pqrs.dto';
import { PqrsAttachment } from './entities/pqrs-attachment.entity';
import { PqrsCase } from './entities/pqrs-case.entity';
import { PqrsComment } from './entities/pqrs-comment.entity';
import { PqrsCounter } from './entities/pqrs-counter.entity';
import { PqrsHistory } from './entities/pqrs-history.entity';
import { PqrsSlaConfig } from './entities/pqrs-sla-config.entity';
import {
  PqrsCategory,
  PqrsHistoryEvent,
  PqrsStatus,
} from './enums/pqrs.enums';
import { PqrsService } from './pqrs.service';

describe('PqrsService', () => {
  let service: PqrsService;

  const caseRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: PqrsCase) => ({
      ...x,
      id: x.id ?? 'pqrs-1',
      createdAt: x.createdAt ?? new Date('2026-07-31T12:00:00.000Z'),
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    })),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const commentRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: PqrsComment) => x),
    find: jest.fn().mockResolvedValue([]),
  };
  const attachmentRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: PqrsAttachment) => x),
    find: jest.fn().mockResolvedValue([]),
  };
  const historyRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: PqrsHistory) => x),
    find: jest.fn().mockResolvedValue([]),
  };
  const slaRepo = {
    findOne: jest.fn().mockResolvedValue({
      category: PqrsCategory.COMPLAINT,
      hours: 48,
    }),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: PqrsSlaConfig) => ({
      ...x,
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    })),
  };
  const userRepo = {
    findOne: jest.fn(),
  };
  const orderRepo = { findOne: jest.fn() };
  const cinemaRepo = { findOne: jest.fn() };
  const emailService = {
    sendPqrsCreated: jest.fn().mockResolvedValue({}),
    sendPqrsUpdated: jest.fn().mockResolvedValue({}),
    sendPqrsResolved: jest.fn().mockResolvedValue({}),
  };

  const counter = { year: 2026, lastNumber: 0 };
  const counterRepo = {
    findOne: jest.fn(async () => ({ ...counter, lastNumber: counter.lastNumber })),
    insert: jest.fn(),
    save: jest.fn(async (c: { lastNumber: number; year: number }) => {
      counter.lastNumber = c.lastNumber;
      return c;
    }),
  };
  const dataSource = {
    transaction: jest.fn(
      async (fn: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === PqrsCase) return caseRepo;
            if (entity === PqrsHistory) return historyRepo;
            if (entity === PqrsAttachment) return attachmentRepo;
            if (entity === PqrsCounter) return counterRepo;
            return counterRepo;
          },
        };
        return fn(manager);
      },
    ),
  };

  const baseDto = (): CreatePqrsDto => ({
    category: PqrsCategory.COMPLAINT,
    subject: 'Silla rota en VIP',
    description: 'La silla F12 no reclinaba correctamente en la función.',
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    counter.lastNumber = 0;
    caseRepo.findOne.mockResolvedValue(null);
    caseRepo.find.mockResolvedValue([]);
    commentRepo.find.mockResolvedValue([]);
    attachmentRepo.find.mockResolvedValue([]);
    historyRepo.find.mockResolvedValue([]);
    slaRepo.findOne.mockResolvedValue({
      category: PqrsCategory.COMPLAINT,
      hours: 48,
    });
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'cliente@test.com',
      role: UserRole.CUSTOMER,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PqrsService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(PqrsCase), useValue: caseRepo },
        { provide: getRepositoryToken(PqrsComment), useValue: commentRepo },
        {
          provide: getRepositoryToken(PqrsAttachment),
          useValue: attachmentRepo,
        },
        { provide: getRepositoryToken(PqrsHistory), useValue: historyRepo },
        { provide: getRepositoryToken(PqrsSlaConfig), useValue: slaRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Cinema), useValue: cinemaRepo },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(PqrsService);
  });

  it('create genera consecutivo RN-110, SLA RN-111 y notifica RN-112', async () => {
    const persisted = {
      id: 'pqrs-1',
      ticketNumber: 'PQRS-2026-000001',
      userId: 'user-1',
      category: PqrsCategory.COMPLAINT,
      subject: 'Silla rota en VIP',
      description: 'La silla F12 no reclinaba correctamente en la función.',
      status: PqrsStatus.OPEN,
      assignedToUserId: null,
      slaHours: 48,
      slaDueAt: new Date('2026-08-02T12:00:00.000Z'),
      orderId: null,
      cinemaId: null,
      closedAt: null,
      createdAt: new Date('2026-07-31T12:00:00.000Z'),
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    };
    caseRepo.save.mockImplementation(async (x: PqrsCase) => ({
      ...persisted,
      ...x,
      id: 'pqrs-1',
      ticketNumber: x.ticketNumber ?? persisted.ticketNumber,
    }));
    caseRepo.findOne.mockResolvedValue(persisted);

    const result = await service.create('user-1', 'cliente@test.com', baseDto());

    expect(result.ticketNumber).toBe('PQRS-2026-000001');
    expect(result.slaHours).toBe(48);
    expect(emailService.sendPqrsCreated).toHaveBeenCalled();
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ event: PqrsHistoryEvent.CREATED }),
    );
  });

  it('getDetail niega a otro cliente', async () => {
    caseRepo.findOne.mockResolvedValue({
      id: 'pqrs-1',
      userId: 'owner',
      status: PqrsStatus.OPEN,
      slaDueAt: new Date('2099-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ticketNumber: 'PQRS-2026-000001',
      category: PqrsCategory.PETITION,
      subject: 'x',
      description: 'y',
      assignedToUserId: null,
      slaHours: 72,
      orderId: null,
      cinemaId: null,
      closedAt: null,
    });

    await expect(
      service.getDetail('other', UserRole.CUSTOMER, 'pqrs-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update de status por cliente lanza Forbidden', async () => {
    caseRepo.findOne.mockResolvedValue({
      id: 'pqrs-1',
      userId: 'user-1',
      status: PqrsStatus.OPEN,
      slaDueAt: new Date('2099-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ticketNumber: 'PQRS-2026-000001',
      category: PqrsCategory.PETITION,
      subject: 'x',
      description: 'y',
      assignedToUserId: null,
      slaHours: 72,
      orderId: null,
      cinemaId: null,
      closedAt: null,
    });

    await expect(
      service.update(
        { userId: 'user-1', email: 'c@t.com', role: UserRole.CUSTOMER },
        'pqrs-1',
        { status: PqrsStatus.IN_PROGRESS },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('staff asigna y cambia estado; notifica resolución', async () => {
    const pqrs = {
      id: 'pqrs-1',
      userId: 'user-1',
      status: PqrsStatus.OPEN,
      slaDueAt: new Date('2099-01-01'),
      createdAt: new Date('2026-07-31T12:00:00.000Z'),
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
      ticketNumber: 'PQRS-2026-000001',
      category: PqrsCategory.COMPLAINT,
      subject: 'Silla',
      description: 'Detalle largo suficiente',
      assignedToUserId: null as string | null,
      slaHours: 48,
      orderId: null,
      cinemaId: null,
      closedAt: null as Date | null,
    };
    caseRepo.findOne.mockResolvedValue(pqrs);
    userRepo.findOne
      .mockResolvedValueOnce({
        id: 'staff-1',
        email: 'staff@test.com',
        role: UserRole.STAFF,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'cliente@test.com',
        role: UserRole.CUSTOMER,
      });

    await service.update(
      { userId: 'staff-1', email: 'staff@test.com', role: UserRole.STAFF },
      'pqrs-1',
      {
        assignedToUserId: 'staff-1',
        status: PqrsStatus.RESOLVED,
        comment: 'Reparamos la silla y ofrecimos snack de cortesía.',
      },
    );

    expect(pqrs.status).toBe(PqrsStatus.RESOLVED);
    expect(pqrs.assignedToUserId).toBe('staff-1');
    expect(emailService.sendPqrsResolved).toHaveBeenCalled();
  });

  it('updateSla guarda horas (RN-111)', async () => {
    slaRepo.findOne.mockResolvedValue(null);
    const view = await service.updateSla({
      category: PqrsCategory.CLAIM,
      hours: 24,
    });
    expect(view.hours).toBe(24);
    expect(view.category).toBe(PqrsCategory.CLAIM);
  });

  it('create con orderId ajeno falla', async () => {
    orderRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create('user-1', 'c@t.com', {
        ...baseDto(),
        orderId: 'order-x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update vacío lanza BadRequest', async () => {
    caseRepo.findOne.mockResolvedValue({
      id: 'pqrs-1',
      userId: 'user-1',
      status: PqrsStatus.OPEN,
      slaDueAt: new Date('2099-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ticketNumber: 'PQRS-2026-000001',
      category: PqrsCategory.PETITION,
      subject: 'x',
      description: 'y',
      assignedToUserId: null,
      slaHours: 72,
      orderId: null,
      cinemaId: null,
      closedAt: null,
    });

    await expect(
      service.update(
        { userId: 'user-1', email: 'c@t.com', role: UserRole.CUSTOMER },
        'pqrs-1',
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
