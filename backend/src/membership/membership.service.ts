import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { Membership } from './entities/membership.entity';
import { Wallet } from './entities/wallet.entity';
import { MembershipLevel, MembershipStatus } from './enums/membership.enums';
import {
  benefitsForLevel,
  MembershipBenefit,
} from './membership-benefits';

/**
 * Vista pública de la membresía creada.
 */
export type MembershipResult = {
  id: string;
  userId: string;
  code: string;
  status: MembershipStatus;
  level: MembershipLevel;
  createdAt: string;
};

/**
 * Detalle de membresía para `GET /membership` (HU-008).
 *
 * Incluye beneficios (RN-032), payload del QR (RN-033) y
 * historiales vacíos hasta que existan órdenes (HU-014) y puntos (HU-023).
 */
export type MembershipDetailResult = {
  id: string;
  userId: string;
  code: string;
  status: MembershipStatus;
  level: MembershipLevel;
  /** Descuentos vigentes según el nivel (RN-032). */
  benefits: MembershipBenefit[];
  /**
   * Contenido único a codificar en el QR de socio (RN-033).
   * Es el `code` de membresía: único e intransferible (1:1 con el usuario).
   * El frontend renderiza el QR; el backend no genera la imagen.
   */
  qr: {
    payload: string;
    transferable: false;
  };
  /** Saldo de billetera (bonos/giftcards; carga real = HU-018). */
  wallet: {
    balance: string;
  };
  /** Compras; vacío hasta HU-014. */
  purchaseHistory: [];
  /** Movimientos de puntos; vacío hasta HU-023. */
  pointsHistory: [];
  /** Reservas activas; vacío hasta carrito/tickets (HU-011+). */
  activeReservations: [];
  createdAt: string;
};

/**
 * Servicio de membresía digital y billetera (HU-006 / HU-008).
 *
 * RN-025 / RN-026: crea membresía con código único y billetera vacía.
 * RN-032 / RN-033: consulta de beneficios y QR de socio.
 */
@Injectable()
export class MembershipService {
  /**
   * @param membershipRepo - Persistencia de membresías.
   * @param walletRepo - Saldo de bonos del socio.
   * @param userRepo - Valida que el usuario exista.
   * @param dataSource - Transacciones al crear membresía + wallet.
   */
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Endpoint `POST /membership/create`.
   *
   * @param dto - `userId` del titular.
   * @returns {Promise<MembershipResult>} Membresía creada.
   */
  async create(dto: CreateMembershipDto): Promise<MembershipResult> {
    return this.createForUser(dto.userId);
  }

  /**
   * Crea membresía + billetera para un usuario (transacción propia).
   *
   * @param userId - UUID del usuario ya persistido.
   * @returns {Promise<MembershipResult>} Membresía con código único.
   * @throws {NotFoundException} Usuario inexistente.
   * @throws {ConflictException} Ya tiene membresía (RN-025 = 1:1).
   */
  async createForUser(userId: string): Promise<MembershipResult> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario no encontrado: ${userId}`);
    }

    const existing = await this.membershipRepo.findOne({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException(
        'El usuario ya tiene una membresía digital (RN-025)',
      );
    }

    return this.dataSource.transaction((manager) =>
      this.persistMembershipAndWallet(userId, manager),
    );
  }

  /**
   * Busca la membresía de un usuario (login HU-007).
   *
   * @param userId - UUID del titular.
   * @returns {Promise<Membership | null>} Membresía o null.
   */
  async findByUserId(userId: string): Promise<Membership | null> {
    return this.membershipRepo.findOne({ where: { userId } });
  }

  /**
   * `GET /membership`: detalle del socio autenticado (HU-008).
   *
   * @param userId - UUID del titular (JWT).
   * @returns {Promise<MembershipDetailResult>} Membresía + beneficios + QR.
   * @throws {NotFoundException} Sin membresía (no debería ocurrir tras HU-006).
   */
  async getDetailForUser(userId: string): Promise<MembershipDetailResult> {
    const membership = await this.membershipRepo.findOne({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException(
        `Membresía no encontrada para el usuario: ${userId}`,
      );
    }

    const wallet = await this.walletRepo.findOne({ where: { userId } });

    return {
      id: membership.id,
      userId: membership.userId,
      code: membership.code,
      status: membership.status,
      level: membership.level,
      benefits: benefitsForLevel(membership.level),
      qr: {
        payload: membership.code,
        transferable: false,
      },
      wallet: {
        balance: wallet?.balance ?? '0.00',
      },
      purchaseHistory: [],
      pointsHistory: [],
      activeReservations: [],
      createdAt: membership.createdAt.toISOString(),
    };
  }

  /**
   * Crea membresía + billetera dentro de una transacción ajena
   * (p. ej. el registro atómico de `AuthService`).
   *
   * @param userId - Usuario recién insertado en la misma TX.
   * @param manager - EntityManager de la transacción abierta.
   * @returns {Promise<MembershipResult>} Membresía creada.
   */
  async persistMembershipAndWallet(
    userId: string,
    manager: EntityManager,
  ): Promise<MembershipResult> {
    const code = await this.generateUniqueCode(manager);

    const savedMembership = await manager.save(
      Membership,
      manager.create(Membership, {
        userId,
        code,
        status: MembershipStatus.ACTIVE,
        level: MembershipLevel.BRONZE,
      }),
    );

    await manager.save(
      Wallet,
      manager.create(Wallet, {
        userId,
        balance: '0.00',
      }),
    );

    return this.toResult(savedMembership);
  }

  /**
   * Genera un código `MC-` + 8 hex en mayúsculas, único en BD (RN-026).
   *
   * @param manager - Opcional: busca unicidad dentro de la TX abierta.
   * @returns {Promise<string>} Código único.
   */
  async generateUniqueCode(manager?: EntityManager): Promise<string> {
    const repo = manager
      ? manager.getRepository(Membership)
      : this.membershipRepo;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = `MC-${randomBytes(4).toString('hex').toUpperCase()}`;
      const clash = await repo.findOne({ where: { code } });
      if (!clash) {
        return code;
      }
    }
    throw new ConflictException(
      'No se pudo generar un código de membresía único',
    );
  }

  /**
   * Mapea entidad → DTO de respuesta.
   *
   * @param membership - Fila persistida.
   * @returns Vista serializable.
   */
  private toResult(membership: Membership): MembershipResult {
    return {
      id: membership.id,
      userId: membership.userId,
      code: membership.code,
      status: membership.status,
      level: membership.level,
      createdAt: membership.createdAt.toISOString(),
    };
  }
}
