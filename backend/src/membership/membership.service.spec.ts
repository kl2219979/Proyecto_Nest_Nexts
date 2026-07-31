/**
 * Tests unitarios de `MembershipService` (HU-006 / HU-008).
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Invoice } from '../tickets/entities/invoice.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { Membership } from './entities/membership.entity';
import { Wallet } from './entities/wallet.entity';
import { MembershipLevel, MembershipStatus } from './enums/membership.enums';
import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  let service: MembershipService;

  const membershipRepo = {
    findOne: jest.fn(),
  };
  const walletRepo = {
    findOne: jest.fn(),
  };
  const userRepo = {
    findOne: jest.fn(),
  };
  const invoiceRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const manager = {
    getRepository: jest.fn(() => membershipRepo),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((entity: unknown, data: Record<string, unknown>) => {
      if (entity === Membership) {
        return Promise.resolve({
          id: 'mem-1',
          createdAt: new Date('2026-07-30T12:00:00Z'),
          ...data,
        });
      }
      return Promise.resolve(data);
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (m: typeof manager) => Promise<unknown>) =>
      cb(manager),
    ),
  };

  /**
   * Arma el módulo de testing.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    membershipRepo.findOne.mockResolvedValue(null);
    walletRepo.findOne.mockResolvedValue({ balance: '0.00' });
    userRepo.findOne.mockResolvedValue({ id: 'user-1' });
    invoiceRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: getRepositoryToken(Membership), useValue: membershipRepo },
        { provide: getRepositoryToken(Wallet), useValue: walletRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        {
          provide: LoyaltyService,
          useValue: {
            getHistoryForMembership: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(MembershipService);
  });

  /**
   * Crea membresía Bronce activa con código MC-*.
   *
   * @returns {Promise<void>}
   */
  it('createForUser creates ACTIVE BRONZE membership and wallet', async () => {
    const result = await service.createForUser('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.status).toBe(MembershipStatus.ACTIVE);
    expect(result.level).toBe(MembershipLevel.BRONZE);
    expect(result.code).toMatch(/^MC-[A-F0-9]{8}$/);
    expect(manager.save).toHaveBeenCalledWith(Membership, expect.any(Object));
    expect(manager.save).toHaveBeenCalledWith(Wallet, expect.any(Object));
  });

  /**
   * Rechaza si el usuario no existe.
   *
   * @returns {Promise<void>}
   */
  it('createForUser throws NotFoundException when user missing', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.createForUser('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  /**
   * Rechaza membresía duplicada (RN-025).
   *
   * @returns {Promise<void>}
   */
  it('createForUser throws ConflictException when membership exists', async () => {
    membershipRepo.findOne.mockResolvedValue({ id: 'mem-1' });
    await expect(service.createForUser('user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  /**
   * GET detalle: beneficios Bronce + QR con código (RN-032 / RN-033).
   *
   * @returns {Promise<void>}
   */
  it('getDetailForUser returns benefits, QR payload and empty histories', async () => {
    membershipRepo.findOne.mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      code: 'MC-ABCDEF12',
      status: MembershipStatus.ACTIVE,
      level: MembershipLevel.BRONZE,
      createdAt: new Date('2026-07-30T12:00:00Z'),
    });

    const detail = await service.getDetailForUser('user-1');

    expect(detail.code).toBe('MC-ABCDEF12');
    expect(detail.qr).toEqual({
      payload: 'MC-ABCDEF12',
      transferable: false,
    });
    expect(detail.benefits[0]?.discountPercent).toBe(5);
    expect(detail.wallet.balance).toBe('0.00');
    expect(detail.purchaseHistory).toEqual([]);
    expect(detail.pointsHistory).toEqual([]);
    expect(detail.activeReservations).toEqual([]);
  });

  /**
   * GET detalle sin membresía → 404.
   *
   * @returns {Promise<void>}
   */
  it('getDetailForUser throws NotFoundException when missing', async () => {
    membershipRepo.findOne.mockResolvedValue(null);
    await expect(service.getDetailForUser('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
