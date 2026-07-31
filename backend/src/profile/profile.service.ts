import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { DocumentType, Gender } from '../auth/enums/user.enums';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { EmailService } from '../notifications/email.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Vigencia del token de re-activación tras cambio de email (RN-034). */
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Vista completa del perfil para `GET /profile` (HU-008).
 */
export type ProfileResult = {
  userId: string;
  email: string;
  isEmailVerified: boolean;
  isActive: boolean;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender | null;
  cityId: string;
  favoriteCinemaId: string | null;
  photoUrl: string | null;
  notificationPreferences: {
    emailTransactional: boolean;
    emailMarketing: boolean;
    emailUpcoming: boolean;
  };
};

/**
 * Resultado de `PUT /profile`.
 */
export type UpdateProfileResult = ProfileResult & {
  message: string;
  /** `true` si el email cambió y requiere `POST /auth/activate` (RN-034). */
  emailReverificationRequired: boolean;
};

/**
 * Consulta y actualización del perfil del usuario autenticado (HU-008).
 *
 * Controller → Service → Repository. No conoce JWT; recibe `userId`.
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  /**
   * @param userRepo - Cuenta (email, teléfono, flags de activación).
   * @param profileRepo - Datos demográficos y foto.
   * @param prefsRepo - Preferencias de notificación.
   * @param cityRepo - Valida ciudad activa.
   * @param cinemaRepo - Valida complejo favorito.
   * @param emailService - Correos de perfil / re-verificación (HU-015).
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(NotificationPreference)
    private readonly prefsRepo: Repository<NotificationPreference>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * `GET /profile`: información personal + preferencias.
   *
   * @param userId - UUID del usuario autenticado.
   * @returns {Promise<ProfileResult>} Perfil serializable.
   * @throws {NotFoundException} Usuario o perfil inexistente.
   */
  async getProfile(userId: string): Promise<ProfileResult> {
    const { user, profile, prefs } = await this.loadOwned(userId);
    return this.toResult(user, profile, prefs);
  }

  /**
   * `PUT /profile`: actualiza solo los campos enviados.
   *
   * RN-034: si cambia el correo → nueva validación (cuenta inactiva hasta
   * `POST /auth/activate` con el token del nuevo email).
   *
   * @param userId - UUID del usuario autenticado.
   * @param dto - Campos opcionales a actualizar.
   * @returns {Promise<UpdateProfileResult>} Perfil actualizado + mensaje.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UpdateProfileResult> {
    const { user, profile, prefs } = await this.loadOwned(userId);

    if (dto.cityId !== undefined || dto.favoriteCinemaId !== undefined) {
      await this.validateLocation(
        dto.cityId ?? profile.cityId,
        dto.favoriteCinemaId !== undefined
          ? dto.favoriteCinemaId
          : profile.favoriteCinemaId,
      );
    }

    let emailReverificationRequired = false;

    if (dto.email !== undefined) {
      const newEmail = dto.email.trim().toLowerCase();
      if (newEmail !== user.email) {
        const clash = await this.userRepo.findOne({
          where: { email: newEmail },
        });
        if (clash) {
          throw new ConflictException(
            'El correo electrónico ya está registrado (RN-021)',
          );
        }

        const activationToken = randomBytes(32).toString('hex');
        user.email = newEmail;
        user.isEmailVerified = false;
        user.isActive = false;
        user.activationToken = activationToken;
        user.activationTokenExpiresAt = new Date(
          Date.now() + ACTIVATION_TTL_MS,
        );
        emailReverificationRequired = true;
        void this.emailService
          .sendEmailReverification(userId, newEmail, activationToken)
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Fallo correo re-verificación: ${msg}`);
          });
      }
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone.trim();
    }

    if (dto.firstName !== undefined) {
      profile.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined) {
      profile.lastName = dto.lastName.trim();
    }
    if (dto.birthDate !== undefined) {
      profile.birthDate = dto.birthDate;
    }
    if (dto.gender !== undefined) {
      profile.gender = dto.gender;
    }
    if (dto.cityId !== undefined) {
      profile.cityId = dto.cityId;
    }
    if (dto.favoriteCinemaId !== undefined) {
      profile.favoriteCinemaId = dto.favoriteCinemaId;
    }
    if (dto.photoUrl !== undefined) {
      profile.photoUrl = dto.photoUrl;
    }

    if (dto.notificationPreferences) {
      const np = dto.notificationPreferences;
      if (np.emailTransactional !== undefined) {
        prefs.emailTransactional = np.emailTransactional;
      }
      if (np.emailMarketing !== undefined) {
        prefs.emailMarketing = np.emailMarketing;
      }
      if (np.emailUpcoming !== undefined) {
        prefs.emailUpcoming = np.emailUpcoming;
      }
    }

    await this.userRepo.save(user);
    await this.profileRepo.save(profile);
    await this.prefsRepo.save(prefs);

    if (!emailReverificationRequired) {
      void this.emailService
        .sendProfileUpdated(userId, user.email)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Fallo correo perfil actualizado: ${msg}`);
        });
    }

    const result = this.toResult(user, profile, prefs);
    return {
      ...result,
      emailReverificationRequired,
      message: emailReverificationRequired
        ? 'Perfil actualizado. Revisa el nuevo correo para reactivar la cuenta (RN-034).'
        : 'Perfil actualizado correctamente',
    };
  }

  /**
   * Carga usuario + perfil + preferencias del titular.
   *
   * @param userId - UUID.
   * @returns Entidades relacionadas.
   */
  private async loadOwned(userId: string): Promise<{
    user: User;
    profile: UserProfile;
    prefs: NotificationPreference;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario no encontrado: ${userId}`);
    }

    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`Perfil no encontrado para: ${userId}`);
    }

    const prefs = await this.prefsRepo.findOne({ where: { userId } });
    if (!prefs) {
      throw new NotFoundException(
        `Preferencias de notificación no encontradas para: ${userId}`,
      );
    }

    return { user, profile, prefs };
  }

  /**
   * Valida ciudad activa y que el cine (si hay) pertenezca a esa ciudad.
   *
   * @param cityId - Ciudad objetivo.
   * @param favoriteCinemaId - Complejo favorito o null.
   */
  private async validateLocation(
    cityId: string,
    favoriteCinemaId: string | null,
  ): Promise<void> {
    const city = await this.cityRepo.findOne({
      where: { id: cityId, isActive: true },
    });
    if (!city) {
      throw new BadRequestException(
        'La ciudad no existe o no está activa',
      );
    }

    if (favoriteCinemaId) {
      const cinema = await this.cinemaRepo.findOne({
        where: {
          id: favoriteCinemaId,
          cityId,
          isActive: true,
        },
      });
      if (!cinema) {
        throw new BadRequestException(
          'El complejo favorito no pertenece a la ciudad o no está activo',
        );
      }
    }
  }

  /**
   * Mapea entidades → DTO de respuesta.
   *
   * @param user - Cuenta.
   * @param profile - Perfil.
   * @param prefs - Preferencias.
   * @returns Vista serializable.
   */
  private toResult(
    user: User,
    profile: UserProfile,
    prefs: NotificationPreference,
  ): ProfileResult {
    return {
      userId: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      phone: user.phone,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDate: profile.birthDate,
      gender: profile.gender,
      cityId: profile.cityId,
      favoriteCinemaId: profile.favoriteCinemaId,
      photoUrl: profile.photoUrl,
      notificationPreferences: {
        emailTransactional: prefs.emailTransactional,
        emailMarketing: prefs.emailMarketing,
        emailUpcoming: prefs.emailUpcoming,
      },
    };
  }
}
