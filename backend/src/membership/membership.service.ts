import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Invoice } from '../tickets/entities/invoice.entity';
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

/** Resumen de compra en el historial de membresía (HU-014). */
export type MembershipPurchaseItem = {
  invoiceId: string;
  orderId: string;
  number: string;
  total: number;
  currency: string;
  cinemaName: string | null;
  issuedAt: string;
};

/**
 * Detalle de membresía para `GET /membership` (HU-008).
 *
 * Incluye beneficios (RN-032), payload del QR (RN-033) y
 * historial de compras (HU-014). Puntos = HU-023.
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
  /** Compras con factura emitida (HU-014). */
  purchaseHistory: MembershipPurchaseItem[];
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
   * @param invoiceRepo - Historial de compras (facturas HU-014).
   * @param dataSource - Transacciones al crear membresía + wallet.
   */
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
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
    const invoices = await this.invoiceRepo.find({
      where: { userId },
      order: { issuedAt: 'DESC' },
      take: 50,
    });
    const purchaseHistory: MembershipPurchaseItem[] = invoices.map((inv) => ({
      invoiceId: inv.id,
      orderId: inv.orderId,
      number: inv.number,
      total: Number(inv.total),
      currency: inv.currency,
      cinemaName: inv.cinemaName,
      issuedAt: inv.issuedAt.toISOString(),
    }));

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
      purchaseHistory,
      pointsHistory: [],
      activeReservations: [],
      createdAt: membership.createdAt.toISOString(),
    };
  }

  /**
   * Acredita saldo a favor en la billetera (HU-016: diferencia negativa al reprogramar).
   *
   * La carga formal de giftcards llega en HU-018; aquí solo se usa como
   * “saldo a favor” tras un cambio de función más barato.
   *
   * @param userId - Titular de la billetera.
   * @param amount - Monto positivo a sumar (COP).
   * @returns Nuevo balance como string decimal.
   */
  async creditWallet(userId: string, amount: number): Promise<string> {
    if (amount <= 0) {
      throw new ConflictException('El crédito a billetera debe ser positivo');
    }
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException(`Billetera no encontrada para usuario ${userId}`);
    }
    const next = Number(wallet.balance) + amount;
    wallet.balance = next.toFixed(2);
    await this.walletRepo.save(wallet);
    return wallet.balance;
  }

  /**
   * Debita saldo de la billetera para cubrir un excedente (HU-016).
   *
   * @param userId - Titular.
   * @param amount - Monto positivo a restar (COP).
   * @returns Nuevo balance.
   * @throws {ConflictException} Saldo insuficiente.
   */
  async debitWallet(userId: string, amount: number): Promise<string> {
    if (amount <= 0) {
      throw new ConflictException('El débito de billetera debe ser positivo');
    }
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException(`Billetera no encontrada para usuario ${userId}`);
    }
    const current = Number(wallet.balance);
    if (current < amount) {
      throw new ConflictException({
        message:
          'Saldo de billetera insuficiente para el excedente del cambio de función',
        code: 'WALLET_INSUFFICIENT',
        balance: wallet.balance,
        required: amount.toFixed(2),
      });
    }
    wallet.balance = (current - amount).toFixed(2);
    await this.walletRepo.save(wallet);
    return wallet.balance;
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
