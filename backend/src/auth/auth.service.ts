import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import {
  MembershipResult,
  MembershipService,
} from '../membership/membership.service';
import { EmailService } from '../notifications/email.service';
import { CaptchaService } from './captcha/captcha.service';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ClientContext, LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginAudit } from './entities/login-audit.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user.enums';
import { JwtPayload } from './jwt/jwt-payload';
import {
  benefitsForLevel,
  LoginMembershipSummary,
} from '../membership/membership-benefits';

/** Coste BCrypt (2^10 iteraciones): equilibrio seguridad / latencia. */
const BCRYPT_ROUNDS = 10;

/** Vigencia del token de activación: 24 horas (HU-006). */
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

/** RN-028: Access Token 15 minutos. */
const ACCESS_TTL_SEC = 15 * 60;

/** RN-029: Refresh Token 7 días. */
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** RN-027: bloqueo tras 5 fallos. */
const MAX_FAILED_ATTEMPTS = 5;

/** RN-027: duración del bloqueo = 15 minutos. */
const LOCK_TTL_MS = 15 * 60 * 1000;

/** Token de reset de contraseña: 1 hora. */
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Respuesta de registro exitoso (HU-006).
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
 * Respuesta de activación de cuenta (HU-006).
 */
export type ActivateResult = {
  userId: string;
  email: string;
  isEmailVerified: boolean;
  isActive: boolean;
  message: string;
};

/**
 * Perfil básico incluido en el login (HU-007).
 */
export type LoginProfileSummary = {
  firstName: string;
  lastName: string;
  cityId: string;
  favoriteCinemaId: string | null;
};

/**
 * Respuesta de login / refresh exitoso.
 */
export type AuthTokensResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    /** Rol RBAC (HU-020) para el cliente / backoffice. */
    role: UserRole;
    profile: LoginProfileSummary | null;
  };
  membership: LoginMembershipSummary | null;
};

/**
 * Auth: registro (HU-006) + sesión JWT (HU-007).
 *
 * Controller → Service → Repository.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * @param userRepo - Cuentas.
   * @param profileRepo - Perfil para el payload de login.
   * @param refreshRepo - Refresh tokens persistidos.
   * @param auditRepo - Auditoría IP/dispositivo.
   * @param cityRepo - Valida ciudad en registro.
   * @param cinemaRepo - Valida cine favorito en registro.
   * @param membershipService - Membresía + wallet.
   * @param captchaService - CAPTCHA del registro.
   * @param jwtService - Firma Access JWT.
   * @param dataSource - Transacciones.
   * @param emailService - Correos de activación / reset (HU-015).
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(LoginAudit)
    private readonly auditRepo: Repository<LoginAudit>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
    private readonly membershipService: MembershipService,
    private readonly captchaService: CaptchaService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
  ) {}

  /**
   * Registra un visitante y crea su membresía digital (HU-006).
   *
   * @param dto - Datos del formulario de alta.
   * @returns {Promise<RegisterResult>} Usuario inactivo + membresía activa.
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
            failedLoginAttempts: 0,
            lockedUntil: null,
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

    void this.emailService
      .sendAccountActivation(user.id, user.email, activationToken)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Fallo correo activación: ${msg}`);
      });

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
   * Activa la cuenta con el token del correo (RN-024).
   *
   * @param dto - Token de activación.
   * @returns {Promise<ActivateResult>} Cuenta habilitada.
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

    void this.emailService
      .sendAccountActivated(user.id, user.email)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Fallo correo cuenta activada: ${msg}`);
      });

    return {
      userId: user.id,
      email: user.email,
      isEmailVerified: true,
      isActive: true,
      message: 'Cuenta activada correctamente',
    };
  }

  /**
   * Inicia sesión: Access JWT + Refresh + membresía (HU-007).
   *
   * @param dto - Email y contraseña.
   * @param ctx - IP y User-Agent para auditoría.
   * @returns {Promise<AuthTokensResult>} Tokens y datos de sesión.
   * @throws {UnauthorizedException} Credenciales inválidas.
   * @throws {ForbiddenException} Cuenta bloqueada o no verificada.
   */
  async login(dto: LoginDto, ctx: ClientContext): Promise<AuthTokensResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      await this.audit(null, email, false, 'unknown_email', ctx);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.audit(user.id, email, false, 'locked', ctx);
      throw new ForbiddenException(
        `Cuenta bloqueada temporalmente hasta ${user.lockedUntil.toISOString()} (RN-027)`,
      );
    }

    if (!user.isEmailVerified || !user.isActive) {
      await this.audit(user.id, email, false, 'unverified', ctx);
      throw new ForbiddenException(
        'Debes verificar tu correo antes de iniciar sesión (RN-031)',
      );
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.registerFailedAttempt(user, email, ctx);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepo.save(user);

    await this.revokeActiveRefreshTokens(user.id);
    const tokens = await this.issueTokens(user, ctx);
    await this.audit(user.id, email, true, null, ctx);

    return tokens;
  }

  /**
   * Renueva el Access Token con un Refresh válido (criterio HU-007).
   *
   * @param dto - Refresh token opaco.
   * @returns {Promise<AuthTokensResult>} Nuevo Access (mismo Refresh).
   */
  async refresh(dto: RefreshDto): Promise<AuthTokensResult> {
    const row = await this.findValidRefresh(dto.refreshToken);
    if (!row) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.userRepo.findOne({ where: { id: row.userId } });
    if (!user || !user.isActive || !user.isEmailVerified) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const accessToken = await this.signAccessToken(user);
    return this.buildAuthResult(user, accessToken, dto.refreshToken);
  }

  /**
   * Cierra sesión revocando el Refresh Token.
   *
   * @param dto - Refresh a invalidar.
   * @returns Mensaje de confirmación.
   */
  async logout(dto: LogoutDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const row = await this.refreshRepo.findOne({ where: { tokenHash } });
    if (row && !row.revokedAt) {
      row.revokedAt = new Date();
      await this.refreshRepo.save(row);
    }
    return { message: 'Sesión cerrada' };
  }

  /**
   * Solicita recuperación de contraseña (siempre responde OK genérico).
   *
   * @param dto - Email del usuario.
   * @returns Mensaje neutro.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email } });

    if (user && user.isEmailVerified) {
      const token = randomBytes(32).toString('hex');
      user.passwordResetToken = token;
      user.passwordResetExpiresAt = new Date(
        Date.now() + PASSWORD_RESET_TTL_MS,
      );
      await this.userRepo.save(user);
      void this.emailService
        .sendPasswordReset(user.id, email, token)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Fallo correo reset password: ${msg}`);
        });
    }

    return {
      message:
        'Si el correo está registrado, recibirás instrucciones para restablecer la contraseña',
    };
  }

  /**
   * Aplica nueva contraseña con el token de recuperación.
   *
   * @param dto - Token + nueva password.
   * @returns Confirmación.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { passwordResetToken: dto.token },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Token de recuperación inválido o expirado',
      );
    }

    user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepo.save(user);

    await this.revokeActiveRefreshTokens(user.id);

    void this.emailService
      .sendPasswordChanged(user.id, user.email)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Fallo correo password changed: ${msg}`);
      });

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Incrementa fallos y bloquea a los 5 (RN-027).
   *
   * @param user - Usuario encontrado.
   * @param email - Email del intento.
   * @param ctx - IP / UA.
   */
  private async registerFailedAttempt(
    user: User,
    email: string,
    ctx: ClientContext,
  ): Promise<void> {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_TTL_MS);
      user.failedLoginAttempts = 0;
      await this.audit(user.id, email, false, 'locked_after_failures', ctx);
    } else {
      await this.audit(user.id, email, false, 'bad_password', ctx);
    }
    await this.userRepo.save(user);
  }

  /**
   * Emite Access + Refresh nuevos (invalida refreshes previos vía caller).
   *
   * @param user - Usuario autenticado.
   * @param ctx - IP / UA.
   * @returns Resultado de sesión.
   */
  private async issueTokens(
    user: User,
    ctx: ClientContext,
  ): Promise<AuthTokensResult> {
    const accessToken = await this.signAccessToken(user);
    const rawRefresh = randomBytes(48).toString('hex');

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: this.hashToken(rawRefresh),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        revokedAt: null,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      }),
    );

    return this.buildAuthResult(user, accessToken, rawRefresh);
  }

  /**
   * Firma el Access JWT (RN-028: 15 min).
   *
   * @param user - Titular.
   * @returns JWT compacto.
   */
  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TTL_SEC,
    });
  }

  /**
   * Arma la respuesta con perfil y membresía.
   *
   * @param user - Usuario.
   * @param accessToken - JWT.
   * @param refreshToken - Token opaco en claro (solo al cliente).
   * @returns AuthTokensResult.
   */
  private async buildAuthResult(
    user: User,
    accessToken: string,
    refreshToken: string,
  ): Promise<AuthTokensResult> {
    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
    });
    const membership = await this.membershipService.findByUserId(user.id);

    let membershipSummary: LoginMembershipSummary | null = null;
    if (membership) {
      membershipSummary = {
        id: membership.id,
        code: membership.code,
        status: membership.status,
        level: membership.level,
        benefits: benefitsForLevel(membership.level),
      };
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL_SEC,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profile
          ? {
              firstName: profile.firstName,
              lastName: profile.lastName,
              cityId: profile.cityId,
              favoriteCinemaId: profile.favoriteCinemaId,
            }
          : null,
      },
      membership: membershipSummary,
    };
  }

  /**
   * Busca un refresh no revocado y no expirado.
   *
   * @param rawToken - Token en claro del cliente.
   * @returns Fila o null.
   */
  private async findValidRefresh(
    rawToken: string,
  ): Promise<RefreshToken | null> {
    const row = await this.refreshRepo.findOne({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: IsNull() },
    });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return row;
  }

  /**
   * Revoca todos los refresh activos del usuario (RN-030).
   *
   * @param userId - UUID del usuario.
   */
  private async revokeActiveRefreshTokens(userId: string): Promise<void> {
    const active = await this.refreshRepo.find({
      where: { userId, revokedAt: IsNull() },
    });
    if (active.length === 0) {
      return;
    }
    const now = new Date();
    for (const row of active) {
      row.revokedAt = now;
    }
    await this.refreshRepo.save(active);
  }

  /**
   * Persiste un evento de auditoría de login.
   *
   * @param userId - Usuario o null.
   * @param email - Email intentado.
   * @param success - Éxito / fallo.
   * @param failureReason - Motivo si falló.
   * @param ctx - IP / UA.
   */
  private async audit(
    userId: string | null,
    email: string,
    success: boolean,
    failureReason: string | null,
    ctx: ClientContext,
  ): Promise<void> {
    await this.auditRepo.save(
      this.auditRepo.create({
        userId,
        email,
        success,
        failureReason,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      }),
    );
  }

  /**
   * Hash SHA-256 del refresh (no se guarda en claro).
   *
   * @param raw - Token opaco.
   * @returns Hex de 64 chars.
   */
  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

}
