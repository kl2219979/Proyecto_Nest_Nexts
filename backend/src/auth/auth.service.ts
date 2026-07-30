import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import {
  MembershipResult,
  MembershipService,
} from '../membership/membership.service';
import { CaptchaService } from './captcha/captcha.service';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { RegisterDto } from './dto/register.dto';
import { NotificationPreference } from './entities/notification-preference.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';

/** Coste BCrypt (2^10 iteraciones): equilibrio seguridad / latencia en registro. */
const BCRYPT_ROUNDS = 10;

/** Vigencia del token de activación: 24 horas. */
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Respuesta de registro exitoso.
 */
export type RegisterResult = {
  userId: string;
  email: string;
  isEmailVerified: boolean;
  isActive: boolean;
  membership: MembershipResult;
  message: string;
};

/**
 * Respuesta de activación de cuenta.
 */
export type ActivateResult = {
  userId: string;
  email: string;
  isEmailVerified: boolean;
  isActive: boolean;
  message: string;
};

/**
 * Registro y activación de cuentas (HU-006).
 *
 * Controller → Service → Repository.
 * Orquesta: CAPTCHA → unicidad email → BCrypt → perfil → preferencias
 * → membresía/billetera → correo de activación (log hasta HU-015).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * @param userRepo - Cuentas.
   * @param cityRepo - Valida ciudad principal.
   * @param cinemaRepo - Valida complejo favorito.
   * @param membershipService - Crea membresía + wallet (RN-025/026).
   * @param captchaService - Verifica CAPTCHA.
   * @param configService - `APP_PUBLIC_URL` para el enlace de activación.
   * @param dataSource - Transacción atómica del alta.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
    private readonly membershipService: MembershipService,
    private readonly captchaService: CaptchaService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registra un visitante y crea su membresía digital.
   *
   * @param dto - Datos del formulario de alta.
   * @returns {Promise<RegisterResult>} Usuario inactivo + membresía activa.
   * @throws {ConflictException} Email duplicado (RN-021).
   * @throws {BadRequestException} CAPTCHA, ciudad o cine inválidos.
   * @throws {NotFoundException} Ciudad / cine no encontrados.
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    this.captchaService.verify(dto.captchaToken);

    const email = dto.email.trim().toLowerCase();

    const duplicate = await this.userRepo.findOne({ where: { email } });
    if (duplicate) {
      throw new ConflictException(
        'Ya existe una cuenta con este correo electrónico (RN-021)',
      );
    }

    const city = await this.cityRepo.findOne({
      where: { id: dto.cityId, isActive: true },
    });
    if (!city) {
      throw new NotFoundException(`Ciudad no encontrada: ${dto.cityId}`);
    }

    if (dto.favoriteCinemaId) {
      const cinema = await this.cinemaRepo.findOne({
        where: {
          id: dto.favoriteCinemaId,
          cityId: dto.cityId,
          isActive: true,
        },
      });
      if (!cinema) {
        throw new BadRequestException(
          'El complejo favorito no pertenece a la ciudad o no está activo',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const activationToken = randomBytes(32).toString('hex');
    const activationTokenExpiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
    const acceptMarketing = dto.acceptMarketing === true;

    const { user, membership } = await this.dataSource.transaction(
      async (manager) => {
        const savedUser = await manager.save(
          User,
          manager.create(User, {
            email,
            passwordHash,
            phone: dto.phone.trim(),
            documentType: dto.documentType,
            documentNumber: dto.documentNumber.trim(),
            isEmailVerified: false,
            isActive: false,
            activationToken,
            activationTokenExpiresAt,
            acceptPrivacy: true,
            acceptTerms: true,
            acceptMarketing,
          }),
        );

        await manager.save(
          UserProfile,
          manager.create(UserProfile, {
            userId: savedUser.id,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            birthDate: dto.birthDate,
            gender: dto.gender ?? null,
            cityId: dto.cityId,
            favoriteCinemaId: dto.favoriteCinemaId ?? null,
          }),
        );

        await manager.save(
          NotificationPreference,
          manager.create(NotificationPreference, {
            userId: savedUser.id,
            emailTransactional: true,
            emailMarketing: acceptMarketing,
            emailUpcoming: true,
          }),
        );

        const savedMembership =
          await this.membershipService.persistMembershipAndWallet(
            savedUser.id,
            manager,
          );

        return { user: savedUser, membership: savedMembership };
      },
    );

    this.dispatchActivationEmail(user.email, activationToken);

    return {
      userId: user.id,
      email: user.email,
      isEmailVerified: false,
      isActive: false,
      membership,
      message:
        'Registro exitoso. Revisa tu correo para activar la cuenta (RN-024).',
    };
  }

  /**
   * Activa la cuenta con el token del correo (RN-024, vigencia 24 h).
   *
   * @param dto - Token de activación.
   * @returns {Promise<ActivateResult>} Cuenta habilitada.
   * @throws {BadRequestException} Token inválido o expirado.
   */
  async activate(dto: ActivateAccountDto): Promise<ActivateResult> {
    const user = await this.userRepo.findOne({
      where: { activationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Token de activación inválido');
    }

    if (
      !user.activationTokenExpiresAt ||
      user.activationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'El token de activación ha expirado (vigencia 24 horas)',
      );
    }

    if (user.isEmailVerified) {
      return {
        userId: user.id,
        email: user.email,
        isEmailVerified: true,
        isActive: user.isActive,
        message: 'La cuenta ya estaba activada',
      };
    }

    user.isEmailVerified = true;
    user.isActive = true;
    user.activationToken = null;
    user.activationTokenExpiresAt = null;
    await this.userRepo.save(user);

    return {
      userId: user.id,
      email: user.email,
      isEmailVerified: true,
      isActive: true,
      message: 'Cuenta activada correctamente',
    };
  }

  /**
   * “Envía” el correo de activación.
   * Hasta HU-015 solo deja traza en log con el enlace.
   *
   * @param email - Destinatario.
   * @param token - Token opaco de 64 hex.
   */
  private dispatchActivationEmail(email: string, token: string): void {
    const baseUrl = this.configService.get<string>(
      'APP_PUBLIC_URL',
      'http://localhost:3000',
    );
    const link = `${baseUrl}/api/v1/auth/activate?token=${token}`;
    this.logger.log(
      `Correo de activación (HU-006 → HU-015) → email=${email} link=${link}`,
    );
  }
}
