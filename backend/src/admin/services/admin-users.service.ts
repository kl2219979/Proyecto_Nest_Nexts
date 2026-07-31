import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { NotificationPreference } from '../../auth/entities/notification-preference.entity';
import { User } from '../../auth/entities/user.entity';
import { UserRole, USER_ROLE_RANK, roleSatisfies } from '../../auth/enums/user.enums';
import { City } from '../../locations/entities/city.entity';
import { Membership } from '../../membership/entities/membership.entity';
import { MembershipService } from '../../membership/membership.service';
import {
  AdminPage,
  AdminPaginationQueryDto,
} from '../dto/admin-pagination.dto';
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from '../dto/admin-write.dto';

const BCRYPT_ROUNDS = 10;
const LOCK_TTL_MS = 15 * 60 * 1000;

/** Vista admin de usuario. */
export type AdminUserView = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  lockedUntil: string | null;
  phone: string;
  documentType: string;
  documentNumber: string;
  profile: {
    firstName: string;
    lastName: string;
    cityId: string;
  } | null;
  membership: {
    id: string;
    code: string;
    level: string;
    status: string;
  } | null;
  createdAt: string;
};

/**
 * Gestión de usuarios, roles y bloqueos (HU-020 / RN-088 / RN-089).
 */
@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(NotificationPreference)
    private readonly prefsRepo: Repository<NotificationPreference>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    private readonly membershipService: MembershipService,
  ) {}

  /**
   * Catálogo de roles disponibles (enum).
   *
   * @returns Lista de roles con rango jerárquico.
   */
  listRoles(): { role: UserRole; rank: number }[] {
    return Object.values(UserRole).map((role) => ({
      role,
      rank: USER_ROLE_RANK[role],
    }));
  }

  /**
   * @param query - Paginación / búsqueda email.
   * @param role - Filtro opcional.
   * @returns Página de usuarios.
   */
  async listUsers(
    query: AdminPaginationQueryDto,
    role?: UserRole,
  ): Promise<AdminPage<AdminUserView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.profile', 'p')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (role) qb.andWhere('u.role = :role', { role });
    if (query.q) {
      qb.andWhere('u.email ILIKE :q', { q: `%${query.q}%` });
    }
    const [rows, total] = await qb.getManyAndCount();
    const items = await Promise.all(rows.map((u) => this.toView(u)));
    return { items, page, limit, total };
  }

  /**
   * @param id - UUID.
   * @returns Vista detallada.
   */
  async getUser(id: string): Promise<AdminUserView> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException(`Usuario no encontrado: ${id}`);
    return this.toView(user);
  }

  /**
   * Alta de colaborador (STAFF/ADMIN) ya verificado.
   *
   * @param dto - Datos.
   * @param actorRole - Rol de quien crea (RN-089).
   * @returns Usuario creado.
   */
  async createUser(
    dto: CreateAdminUserDto,
    actorRole: UserRole,
  ): Promise<AdminUserView> {
    this.assertCanAssignRole(actorRole, dto.role);

    const email = dto.email.trim().toLowerCase();
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('El email ya está registrado');
    }

    const city = await this.cityRepo.findOne({ where: { id: dto.cityId } });
    if (!city) throw new NotFoundException(`Ciudad no encontrada: ${dto.cityId}`);

    const user = await this.userRepo.save(
      this.userRepo.create({
        email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        phone: dto.phone,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        role: dto.role,
        isEmailVerified: true,
        isActive: true,
        acceptPrivacy: true,
        acceptTerms: true,
        acceptMarketing: false,
        activationToken: null,
        activationTokenExpiresAt: null,
      }),
    );

    await this.profileRepo.save(
      this.profileRepo.create({
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        cityId: dto.cityId,
        favoriteCinemaId: null,
        birthDate: '1990-01-01',
        gender: null,
        photoUrl: null,
      }),
    );

    await this.prefsRepo.save(
      this.prefsRepo.create({
        userId: user.id,
        emailTransactional: true,
        emailMarketing: false,
        emailUpcoming: true,
      }),
    );

    await this.membershipService.createForUser(user.id);

    return this.getUser(user.id);
  }

  /**
   * Actualiza rol / activo / bloqueo.
   *
   * @param id - UUID objetivo.
   * @param dto - Campos.
   * @param actor - Quién opera.
   * @returns Vista actualizada.
   */
  async updateUser(
    id: string,
    dto: UpdateAdminUserDto,
    actor: { userId: string; role: UserRole },
  ): Promise<AdminUserView> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario no encontrado: ${id}`);

    if (dto.role !== undefined) {
      this.assertCanAssignRole(actor.role, dto.role);
      if (user.id === actor.userId && dto.role !== actor.role) {
        throw new BadRequestException('No puedes cambiar tu propio rol');
      }
      if (
        user.role === UserRole.SUPER_ADMIN &&
        actor.role !== UserRole.SUPER_ADMIN
      ) {
        throw new ForbiddenException(
          'Solo SUPER_ADMIN puede modificar a otro SUPER_ADMIN (RN-089)',
        );
      }
      user.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      if (user.id === actor.userId && dto.isActive === false) {
        throw new BadRequestException('No puedes desactivar tu propia cuenta');
      }
      user.isActive = dto.isActive;
    }

    if (dto.locked !== undefined) {
      if (dto.locked) {
        user.lockedUntil = new Date(Date.now() + LOCK_TTL_MS);
      } else {
        user.lockedUntil = null;
        user.failedLoginAttempts = 0;
      }
    }

    await this.userRepo.save(user);
    return this.getUser(id);
  }

  /**
   * Solo SUPER_ADMIN asigna SUPER_ADMIN; ADMIN no puede crear SUPER_ADMIN.
   *
   * @param actorRole - Rol del operador.
   * @param targetRole - Rol a asignar.
   */
  private assertCanAssignRole(
    actorRole: UserRole,
    targetRole: UserRole,
  ): void {
    if (targetRole === UserRole.CUSTOMER) {
      return;
    }
    if (!roleSatisfies(actorRole, UserRole.ADMIN)) {
      throw new ForbiddenException('Se requiere ADMIN para asignar roles');
    }
    if (
      targetRole === UserRole.SUPER_ADMIN &&
      actorRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Solo SUPER_ADMIN puede otorgar SUPER_ADMIN (RN-089)',
      );
    }
  }

  private async toView(user: User): Promise<AdminUserView> {
    const membership = await this.membershipRepo.findOne({
      where: { userId: user.id },
    });
    const profile = user.profile;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
      phone: user.phone,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      profile: profile
        ? {
            firstName: profile.firstName,
            lastName: profile.lastName,
            cityId: profile.cityId,
          }
        : null,
      membership: membership
        ? {
            id: membership.id,
            code: membership.code,
            level: membership.level,
            status: membership.status,
          }
        : null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
