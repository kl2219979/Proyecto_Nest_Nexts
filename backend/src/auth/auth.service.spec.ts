/**
 * Tests unitarios de `AuthService` (HU-006).
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { MembershipService } from '../membership/membership.service';
import {
  MembershipLevel,
  MembershipStatus,
} from '../membership/enums/membership.enums';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha/captcha.service';
import { User } from './entities/user.entity';
import { DocumentType } from './enums/user.enums';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;

  const userRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const cityRepo = { findOne: jest.fn() };
  const cinemaRepo = { findOne: jest.fn() };
  const membershipService = {
    persistMembershipAndWallet: jest.fn(),
  };
  const captchaService = { verify: jest.fn() };
  const configService = {
    get: jest.fn((_key: string, fallback?: string) => fallback),
  };
  const manager = {
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((_entity: unknown, data: Record<string, unknown>) =>
      Promise.resolve({
        id: 'user-1',
        ...data,
        createdAt: new Date('2026-07-30T12:00:00Z'),
      }),
    ),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (m: typeof manager) => Promise<unknown>) =>
      cb(manager),
    ),
  };

  /**
   * DTO base válido de registro.
   *
   * @returns RegisterDto de prueba.
   */
  const baseDto = (): RegisterDto => ({
    firstName: 'Ana',
    lastName: 'García',
    documentType: DocumentType.CC,
    documentNumber: '1234567890',
    birthDate: '1995-04-12',
    email: 'Ana.Garcia@Example.com',
    emailConfirm: 'Ana.Garcia@Example.com',
    phone: '3001234567',
    password: 'Segura123!',
    passwordConfirm: 'Segura123!',
    cityId: '00000000-0000-4000-8000-000000000001',
    acceptPrivacy: true,
    acceptTerms: true,
    captchaToken: 'dev-ok',
  });

  /**
   * Arma el módulo de testing.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    captchaService.verify.mockImplementation(() => undefined);
    cityRepo.findOne.mockResolvedValue({ id: 'city-1', isActive: true });
    userRepo.findOne.mockResolvedValue(null);
    membershipService.persistMembershipAndWallet.mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      code: 'MC-AABBCCDD',
      status: MembershipStatus.ACTIVE,
      level: MembershipLevel.BRONZE,
      createdAt: '2026-07-30T12:00:00.000Z',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
        { provide: getRepositoryToken(Cinema), useValue: cinemaRepo },
        { provide: MembershipService, useValue: membershipService },
        { provide: CaptchaService, useValue: captchaService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  /**
   * Flujo feliz: usuario inactivo + membresía activa.
   *
   * @returns {Promise<void>}
   */
  it('register creates inactive user and membership', async () => {
    const result = await service.register(baseDto());

    expect(captchaService.verify).toHaveBeenCalledWith('dev-ok');
    expect(result.userId).toBe('user-1');
    expect(result.email).toBe('ana.garcia@example.com');
    expect(result.isEmailVerified).toBe(false);
    expect(result.isActive).toBe(false);
    expect(result.membership.code).toBe('MC-AABBCCDD');
    expect(membershipService.persistMembershipAndWallet).toHaveBeenCalled();
  });

  /**
   * RN-021: email único.
   *
   * @returns {Promise<void>}
   */
  it('register rejects duplicate email (RN-021)', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'existing' });

    await expect(service.register(baseDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  /**
   * Ciudad inexistente.
   *
   * @returns {Promise<void>}
   */
  it('register rejects missing city', async () => {
    cityRepo.findOne.mockResolvedValue(null);

    await expect(service.register(baseDto())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  /**
   * CAPTCHA inválido.
   *
   * @returns {Promise<void>}
   */
  it('register rejects invalid captcha', async () => {
    captchaService.verify.mockImplementation(() => {
      throw new BadRequestException('CAPTCHA inválido');
    });

    await expect(service.register(baseDto())).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  /**
   * Activación con token válido (RN-024).
   *
   * @returns {Promise<void>}
   */
  it('activate enables account with valid token', async () => {
    const user = {
      id: 'user-1',
      email: 'ana@example.com',
      isEmailVerified: false,
      isActive: false,
      activationToken: 'tok123',
      activationTokenExpiresAt: new Date(Date.now() + 60_000),
    };
    userRepo.findOne.mockResolvedValue(user);
    userRepo.save.mockImplementation((row: typeof user) =>
      Promise.resolve(row),
    );

    const result = await service.activate({ token: 'tok123' });

    expect(result.isActive).toBe(true);
    expect(result.isEmailVerified).toBe(true);
    expect(user.activationToken).toBeNull();
  });

  /**
   * Token expirado.
   *
   * @returns {Promise<void>}
   */
  it('activate rejects expired token', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      activationToken: 'tok123',
      activationTokenExpiresAt: new Date(Date.now() - 1000),
      isEmailVerified: false,
    });

    await expect(service.activate({ token: 'tok123' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
