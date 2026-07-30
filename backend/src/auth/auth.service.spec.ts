/**
 * Tests unitarios de `AuthService` (HU-006 + HU-007).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import {
  MembershipLevel,
  MembershipStatus,
} from '../membership/enums/membership.enums';
import { MembershipService } from '../membership/membership.service';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha/captcha.service';
import { LoginAudit } from './entities/login-audit.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { DocumentType } from './enums/user.enums';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;

  const userRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const profileRepo = { findOne: jest.fn() };
  const refreshRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((row: unknown) => row),
    save: jest.fn((row: unknown) => Promise.resolve(row)),
  };
  const auditRepo = {
    create: jest.fn((row: unknown) => row),
    save: jest.fn((row: unknown) => Promise.resolve(row)),
  };
  const cityRepo = { findOne: jest.fn() };
  const cinemaRepo = { findOne: jest.fn() };
  const membershipService = {
    persistMembershipAndWallet: jest.fn(),
    findByUserId: jest.fn(),
  };
  const captchaService = { verify: jest.fn() };
  const jwtService = {
    signAsync: jest.fn(() => Promise.resolve('access.jwt.token')),
  };
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

  const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

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
    userRepo.save.mockImplementation((row: unknown) => Promise.resolve(row));
    refreshRepo.find.mockResolvedValue([]);
    profileRepo.findOne.mockResolvedValue({
      firstName: 'Ana',
      lastName: 'García',
      cityId: 'city-1',
      favoriteCinemaId: null,
    });
    membershipService.persistMembershipAndWallet.mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      code: 'MC-AABBCCDD',
      status: MembershipStatus.ACTIVE,
      level: MembershipLevel.BRONZE,
      createdAt: '2026-07-30T12:00:00.000Z',
    });
    membershipService.findByUserId.mockResolvedValue({
      id: 'mem-1',
      code: 'MC-AABBCCDD',
      status: MembershipStatus.ACTIVE,
      level: MembershipLevel.BRONZE,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
        { provide: getRepositoryToken(LoginAudit), useValue: auditRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
        { provide: getRepositoryToken(Cinema), useValue: cinemaRepo },
        { provide: MembershipService, useValue: membershipService },
        { provide: CaptchaService, useValue: captchaService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  /**
   * Flujo feliz de registro.
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

    const result = await service.activate({ token: 'tok123' });

    expect(result.isActive).toBe(true);
    expect(result.isEmailVerified).toBe(true);
    expect(user.activationToken).toBeNull();
  });

  /**
   * Token de activación expirado.
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

  /**
   * Login feliz: emite tokens y membresía (HU-007).
   *
   * @returns {Promise<void>}
   */
  it('login issues access and refresh tokens', async () => {
    const passwordHash = await bcrypt.hash('Segura123!', 4);
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const result = await service.login(
      { email: 'ana@example.com', password: 'Segura123!' },
      ctx,
    );

    expect(result.accessToken).toBe('access.jwt.token');
    expect(result.refreshToken).toHaveLength(96);
    expect(result.expiresIn).toBe(15 * 60);
    expect(result.membership?.level).toBe(MembershipLevel.BRONZE);
    expect(result.membership?.benefits.length).toBeGreaterThan(0);
    expect(refreshRepo.save).toHaveBeenCalled();
    expect(auditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  /**
   * RN-031: solo verificados.
   *
   * @returns {Promise<void>}
   */
  it('login rejects unverified users (RN-031)', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      passwordHash: await bcrypt.hash('Segura123!', 4),
      isEmailVerified: false,
      isActive: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await expect(
      service.login({ email: 'ana@example.com', password: 'Segura123!' }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  /**
   * RN-027: bloqueo activo.
   *
   * @returns {Promise<void>}
   */
  it('login rejects locked accounts (RN-027)', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      passwordHash: await bcrypt.hash('Segura123!', 4),
      isEmailVerified: true,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.login({ email: 'ana@example.com', password: 'Segura123!' }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  /**
   * Password incorrecto → Unauthorized.
   *
   * @returns {Promise<void>}
   */
  it('login rejects bad password', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      passwordHash: await bcrypt.hash('Segura123!', 4),
      isEmailVerified: true,
      isActive: true,
      failedLoginAttempts: 2,
      lockedUntil: null,
    });

    await expect(
      service.login({ email: 'ana@example.com', password: 'WrongPass1!' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ failedLoginAttempts: 3 }),
    );
  });

  /**
   * Al 5º fallo bloquea 15 min (RN-027).
   *
   * @returns {Promise<void>}
   */
  it('login locks after 5 failed attempts (RN-027)', async () => {
    const user = {
      id: 'user-1',
      email: 'ana@example.com',
      passwordHash: await bcrypt.hash('Segura123!', 4),
      isEmailVerified: true,
      isActive: true,
      failedLoginAttempts: 4,
      lockedUntil: null as Date | null,
    };
    userRepo.findOne.mockResolvedValue(user);

    await expect(
      service.login({ email: 'ana@example.com', password: 'WrongPass1!' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(user.lockedUntil).toBeInstanceOf(Date);
    expect(user.failedLoginAttempts).toBe(0);
  });

  /**
   * Logout revoca refresh.
   *
   * @returns {Promise<void>}
   */
  it('logout revokes refresh token', async () => {
    const row = {
      tokenHash: 'x',
      revokedAt: null as Date | null,
    };
    refreshRepo.findOne.mockResolvedValue(row);

    const result = await service.logout({ refreshToken: 'raw-token' });

    expect(result.message).toContain('cerrada');
    expect(row.revokedAt).toBeInstanceOf(Date);
  });
});
