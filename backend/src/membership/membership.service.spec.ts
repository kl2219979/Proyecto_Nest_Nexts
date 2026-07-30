/**
 * Tests unitarios de `MembershipService` (HU-006).
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Membership } from './entities/membership.entity';
import { Wallet } from './entities/wallet.entity';
import { MembershipLevel, MembershipStatus } from './enums/membership.enums';
import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  let service: MembershipService;

  const membershipRepo = {
    findOne: jest.fn(),
  };
  const userRepo = {
    findOne: jest.fn(),
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
    userRepo.findOne.mockResolvedValue({ id: 'user-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: getRepositoryToken(Membership), useValue: membershipRepo },
        { provide: getRepositoryToken(Wallet), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
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
   * Usuario inexistente.
   *
   * @returns {Promise<void>}
   */
  it('createForUser rejects missing user', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(service.createForUser('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  /**
   * RN-025: una sola membresía por usuario.
   *
   * @returns {Promise<void>}
   */
  it('createForUser rejects duplicate membership', async () => {
    membershipRepo.findOne.mockResolvedValue({ id: 'existing' });

    await expect(service.createForUser('user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
