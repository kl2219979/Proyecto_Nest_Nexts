/**
 * Tests unitarios de `ProfileService` (HU-008).
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentType, Gender } from '../auth/enums/user.enums';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;

  const user = {
    id: 'user-1',
    email: 'ana@example.com',
    isEmailVerified: true,
    isActive: true,
    phone: '3001234567',
    documentType: DocumentType.CC,
    documentNumber: '123',
    activationToken: null as string | null,
    activationTokenExpiresAt: null as Date | null,
  };

  const profile = {
    userId: 'user-1',
    firstName: 'Ana',
    lastName: 'García',
    birthDate: '1995-04-12',
    gender: Gender.FEMALE,
    cityId: 'city-1',
    favoriteCinemaId: null as string | null,
    photoUrl: null as string | null,
  };

  const prefs = {
    userId: 'user-1',
    emailTransactional: true,
    emailMarketing: false,
    emailUpcoming: true,
  };

  const userRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (u: typeof user) => u),
  };
  const profileRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (p: typeof profile) => p),
  };
  const prefsRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (p: typeof prefs) => p),
  };
  const cityRepo = {
    findOne: jest.fn(),
  };
  const cinemaRepo = {
    findOne: jest.fn(),
  };
  const configService = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };

  /**
   * Arma el módulo de testing.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    userRepo.findOne.mockResolvedValue({ ...user });
    profileRepo.findOne.mockResolvedValue({ ...profile });
    prefsRepo.findOne.mockResolvedValue({ ...prefs });
    cityRepo.findOne.mockResolvedValue({ id: 'city-1', isActive: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: prefsRepo,
        },
        { provide: getRepositoryToken(City), useValue: cityRepo },
        { provide: getRepositoryToken(Cinema), useValue: cinemaRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(ProfileService);
  });

  /**
   * GET perfil con preferencias.
   *
   * @returns {Promise<void>}
   */
  it('getProfile returns personal data and preferences', async () => {
    const result = await service.getProfile('user-1');
    expect(result.email).toBe('ana@example.com');
    expect(result.firstName).toBe('Ana');
    expect(result.notificationPreferences.emailUpcoming).toBe(true);
    expect(result.photoUrl).toBeNull();
  });

  /**
   * PUT actualiza nombre y preferencias sin tocar email.
   *
   * @returns {Promise<void>}
   */
  it('updateProfile updates name and notification prefs', async () => {
    const result = await service.updateProfile('user-1', {
      firstName: 'Anita',
      notificationPreferences: { emailMarketing: true },
    });

    expect(result.firstName).toBe('Anita');
    expect(result.notificationPreferences.emailMarketing).toBe(true);
    expect(result.emailReverificationRequired).toBe(false);
    expect(userRepo.save).toHaveBeenCalled();
    expect(profileRepo.save).toHaveBeenCalled();
    expect(prefsRepo.save).toHaveBeenCalled();
  });

  /**
   * RN-034: cambio de email desactiva y exige re-activación.
   *
   * @returns {Promise<void>}
   */
  it('updateProfile email change requires reverification (RN-034)', async () => {
    userRepo.findOne
      .mockResolvedValueOnce({ ...user })
      .mockResolvedValueOnce(null);

    const result = await service.updateProfile('user-1', {
      email: 'ana.nueva@example.com',
      emailConfirm: 'ana.nueva@example.com',
    });

    expect(result.email).toBe('ana.nueva@example.com');
    expect(result.isEmailVerified).toBe(false);
    expect(result.isActive).toBe(false);
    expect(result.emailReverificationRequired).toBe(true);
    expect(result.message).toMatch(/RN-034/);
  });

  /**
   * Email duplicado → Conflict (RN-021).
   *
   * @returns {Promise<void>}
   */
  it('updateProfile rejects duplicate email', async () => {
    userRepo.findOne
      .mockResolvedValueOnce({ ...user })
      .mockResolvedValueOnce({ id: 'other' });

    await expect(
      service.updateProfile('user-1', {
        email: 'otra@example.com',
        emailConfirm: 'otra@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  /**
   * Ciudad inválida → BadRequest.
   *
   * @returns {Promise<void>}
   */
  it('updateProfile rejects inactive city', async () => {
    cityRepo.findOne.mockResolvedValue(null);
    await expect(
      service.updateProfile('user-1', { cityId: 'bad-city' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  /**
   * Usuario inexistente → NotFound.
   *
   * @returns {Promise<void>}
   */
  it('getProfile throws NotFoundException when user missing', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.getProfile('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
