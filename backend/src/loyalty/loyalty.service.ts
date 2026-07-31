import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { MembershipLevel } from '../membership/enums/membership.enums';
import { Membership } from '../membership/entities/membership.entity';
import { benefitsForLevel } from '../membership/membership-benefits';
import { MembershipService } from '../membership/membership.service';
import { Promotion } from '../promotions/entities/promotion.entity';
import {
  MembershipLevelInfo,
  MembershipLevelsResponse,
  PointsBalanceResponse,
  PointsHistoryItem,
  RedeemPointsResponse,
} from './dto/loyalty-response';
import { PointLedgerEntry } from './entities/point-ledger.entity';
import { PointLedgerType } from './enums/loyalty.enums';
import {
  COP_PER_BASE_POINT,
  COP_PER_REDEEMED_POINT,
  EARN_MULTIPLIER,
  LEVEL_LIFETIME_THRESHOLDS,
  LEVEL_ORDER,
  POINTS_EXPIRY_MONTHS,
} from './loyalty.constants';

/**
 * Programa de fidelización y acumulación de puntos (HU-023).
 *
 * - Acumula al confirmar pago (`earnForOrder`)
 * - Redime en carrito (`previewRedeem` / `consumeForOrder`) o billetera
 * - Vence lotes a los 12 meses (RN-099, perezoso + al consultar)
 * - Respeta promos incompatibles (RN-100)
 * - Sube de nivel automáticamente (RN-101)
 *
 * @remarks
 * **Patrón:** Service + Ledger (FIFO).
 * Problema que resuelve: saldo, vencimiento y auditoría sin acoplar
 * carrito/pagos a la lógica de niveles.
 */
@Injectable()
export class LoyaltyService {
  /**
   * @param ledgerRepo - Movimientos de puntos.
   * @param membershipRepo - Nivel del socio (RN-101).
   * @param promoRepo - Flag `incompatibleWithPoints` (RN-100).
   * @param membershipService - Crédito a billetera en redención WALLET.
   * @param dataSource - Transacciones FIFO / expire.
   */
  constructor(
    @InjectRepository(PointLedgerEntry)
    private readonly ledgerRepo: Repository<PointLedgerEntry>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Promotion)
    private readonly promoRepo: Repository<Promotion>,
    @Inject(forwardRef(() => MembershipService))
    private readonly membershipService: MembershipService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * `GET /points`: saldo disponible, progreso de nivel e historial.
   *
   * Aplica vencimientos pendientes (RN-099) antes de responder.
   *
   * @param userId - Usuario JWT.
   */
  async getBalance(userId: string): Promise<PointsBalanceResponse> {
    await this.expireOverdueLots(userId);

    const membership = await this.requireMembership(userId);
    const available = await this.availablePoints(userId);
    const lifetimeEarned = await this.lifetimeEarned(userId);
    const { nextLevel, pointsToNextLevel } = this.nextLevelProgress(
      lifetimeEarned,
      membership.level,
    );

    const rows = await this.ledgerRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      available,
      lifetimeEarned,
      level: membership.level,
      nextLevel,
      pointsToNextLevel,
      earnMultiplier: EARN_MULTIPLIER[membership.level],
      copPerRedeemedPoint: COP_PER_REDEEMED_POINT,
      history: rows.map((r) => this.toHistoryItem(r)),
    };
  }

  /**
   * Historial corto para embeber en `GET /membership` (HU-008 + HU-023).
   *
   * @param userId - Titular.
   * @param limit - Máximo de filas.
   */
  async getHistoryForMembership(
    userId: string,
    limit = 20,
  ): Promise<PointsHistoryItem[]> {
    await this.expireOverdueLots(userId);
    const rows = await this.ledgerRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((r) => this.toHistoryItem(r));
  }

  /**
   * `GET /membership/levels`: catálogo de niveles y umbrales.
   */
  listLevels(): MembershipLevelsResponse {
    const levels: MembershipLevelInfo[] = LEVEL_ORDER.map((level) => ({
      level,
      lifetimePointsRequired: LEVEL_LIFETIME_THRESHOLDS[level],
      earnMultiplier: EARN_MULTIPLIER[level],
      benefits: benefitsForLevel(level),
    }));
    return {
      levels,
      pointsExpiryMonths: POINTS_EXPIRY_MONTHS,
      copPerBasePoint: COP_PER_BASE_POINT,
      copPerRedeemedPoint: COP_PER_REDEEMED_POINT,
    };
  }

  /**
   * `POST /points`: redime puntos a crédito COP en billetera (bonos).
   *
   * @param userId - Usuario JWT.
   * @param points - Cantidad a redimir.
   */
  async redeemToWallet(
    userId: string,
    points: number,
  ): Promise<RedeemPointsResponse> {
    if (!Number.isInteger(points) || points < 1) {
      throw new BadRequestException('points debe ser un entero ≥ 1');
    }

    await this.expireOverdueLots(userId);
    const available = await this.availablePoints(userId);
    if (available < points) {
      throw new ConflictException({
        message: 'Puntos insuficientes',
        code: 'POINTS_INSUFFICIENT',
        available,
        required: points,
      });
    }

    const amountCop = points * COP_PER_REDEEMED_POINT;
    await this.debitFifo(
      userId,
      points,
      PointLedgerType.REDEEM_WALLET,
      `Redención a billetera (${points} pts → $${amountCop} COP)`,
      null,
      amountCop,
    );

    const walletBalance = await this.membershipService.creditWallet(
      userId,
      amountCop,
    );
    const nextAvailable = await this.availablePoints(userId);

    return {
      pointsRedeemed: points,
      amountCop,
      destination: 'WALLET',
      walletBalance,
      available: nextAvailable,
    };
  }

  /**
   * Preview de redención en carrito (sin debitar).
   * Usado por `POST /cart/apply-points`.
   *
   * @param userId - Usuario.
   * @param points - Puntos solicitados.
   * @param maxCop - Tope del total pagable del carrito.
   * @param promoCode - Cupón del carrito (RN-100).
   * @returns Puntos efectivos y monto COP.
   */
  async previewForCart(
    userId: string,
    points: number,
    maxCop: number,
    promoCode: string | null,
  ): Promise<{ points: number; amountCop: number }> {
    if (!Number.isInteger(points) || points < 1) {
      throw new BadRequestException('points debe ser un entero ≥ 1');
    }

    await this.assertPromoAllowsPoints(promoCode);
    await this.expireOverdueLots(userId);

    const available = await this.availablePoints(userId);
    if (available < points) {
      throw new ConflictException({
        message: 'Puntos insuficientes',
        code: 'POINTS_INSUFFICIENT',
        available,
        required: points,
      });
    }

    const requestedCop = points * COP_PER_REDEEMED_POINT;
    const amountCop = Math.min(requestedCop, Math.max(0, maxCop));
    if (amountCop <= 0) {
      throw new BadRequestException(
        'No hay monto pagable al que aplicar puntos',
      );
    }

    /** Ajusta puntos al COP realmente aplicable (redondeo hacia abajo). */
    const effectivePoints = Math.floor(amountCop / COP_PER_REDEEMED_POINT);
    if (effectivePoints < 1) {
      throw new BadRequestException(
        'El monto pagable es menor al valor de 1 punto',
      );
    }

    return {
      points: effectivePoints,
      amountCop: effectivePoints * COP_PER_REDEEMED_POINT,
    };
  }

  /**
   * Debita puntos al confirmar pago con redención en carrito.
   *
   * @param userId - Comprador.
   * @param points - Puntos congelados en la orden.
   * @param amountCop - Descuento COP aplicado.
   * @param orderId - Orden PAID.
   */
  async consumeForOrder(
    userId: string,
    points: number,
    amountCop: number,
    orderId: string,
  ): Promise<void> {
    if (points <= 0) {
      return;
    }
    await this.expireOverdueLots(userId);
    const available = await this.availablePoints(userId);
    if (available < points) {
      throw new ConflictException({
        message: 'Puntos insuficientes al confirmar el pago',
        code: 'POINTS_INSUFFICIENT',
        available,
        required: points,
      });
    }
    await this.debitFifo(
      userId,
      points,
      PointLedgerType.REDEEM_CART,
      `Redención en compra (orden ${orderId.slice(0, 8)}…)`,
      orderId,
      amountCop,
    );
  }

  /**
   * Acumula puntos tras pago APPROVED (valor compra + nivel + promo).
   *
   * RN-100: si la promo es incompatible, no acumula.
   * RN-101: recalcula nivel tras el EARN.
   *
   * @param params - Datos de la orden pagada.
   * @returns Puntos acreditados (0 si no aplica).
   */
  async earnForOrder(params: {
    userId: string;
    orderId: string;
    /** Subtotal − membresía − promo (valor comercial neto). */
    qualifyingAmountCop: number;
    promoCode: string | null;
  }): Promise<number> {
    const { userId, orderId, qualifyingAmountCop, promoCode } = params;

    const existing = await this.ledgerRepo.findOne({
      where: { orderId, type: PointLedgerType.EARN },
    });
    if (existing) {
      return existing.points;
    }

    if (await this.isPromoIncompatible(promoCode)) {
      return 0;
    }

    if (qualifyingAmountCop <= 0) {
      return 0;
    }

    const membership = await this.requireMembership(userId);
    const multiplier = EARN_MULTIPLIER[membership.level];
    const base = Math.floor(qualifyingAmountCop / COP_PER_BASE_POINT);
    const points = Math.floor(base * multiplier);
    if (points < 1) {
      return 0;
    }

    await this.expireOverdueLots(userId);
    const balanceBefore = await this.availablePoints(userId);
    const expiresAt = this.addMonths(new Date(), POINTS_EXPIRY_MONTHS);

    await this.ledgerRepo.save(
      this.ledgerRepo.create({
        userId,
        type: PointLedgerType.EARN,
        points,
        remaining: points,
        expiresAt,
        orderId,
        amountCop: qualifyingAmountCop,
        description: `Acumulación por compra (×${multiplier} ${membership.level})`,
        balanceAfter: balanceBefore + points,
      }),
    );

    await this.recalculateLevel(userId);
    return points;
  }

  /**
   * Indica si un código (o cadena `A+B`) bloquea acumulación/redención (RN-100).
   *
   * @param promoCode - Código(s) del carrito/orden.
   */
  async isPromoIncompatible(promoCode: string | null): Promise<boolean> {
    if (!promoCode?.trim()) {
      return false;
    }
    const codes = promoCode
      .split('+')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (codes.length === 0) {
      return false;
    }
    const promos = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.code IN (:...codes)', { codes })
      .getMany();
    return promos.some((p) => p.incompatibleWithPoints);
  }

  /**
   * Lanza si la promo del carrito no admite puntos (RN-100).
   *
   * @param promoCode - Cupón aplicado.
   */
  async assertPromoAllowsPoints(promoCode: string | null): Promise<void> {
    if (await this.isPromoIncompatible(promoCode)) {
      throw new ConflictException({
        message:
          'No se pueden usar puntos con esta promoción incompatible (RN-100)',
        code: 'POINTS_PROMO_INCOMPATIBLE',
        promoCode,
      });
    }
  }

  /**
   * Saldo disponible = suma de `remaining` en lotes EARN no vencidos.
   */
  async availablePoints(userId: string): Promise<number> {
    const now = new Date();
    const rows = await this.ledgerRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.remaining), 0)', 'sum')
      .where('e.userId = :userId', { userId })
      .andWhere('e.type = :type', { type: PointLedgerType.EARN })
      .andWhere('e.remaining > 0')
      .andWhere('(e.expiresAt IS NULL OR e.expiresAt > :now)', { now })
      .getRawOne<{ sum: string }>();
    return Number(rows?.sum ?? 0);
  }

  /**
   * Total histórico de puntos ganados (incluye ya vencidos/redimidos).
   * Base del nivel (RN-101).
   */
  async lifetimeEarned(userId: string): Promise<number> {
    const rows = await this.ledgerRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.points), 0)', 'sum')
      .where('e.userId = :userId', { userId })
      .andWhere('e.type = :type', { type: PointLedgerType.EARN })
      .getRawOne<{ sum: string }>();
    return Number(rows?.sum ?? 0);
  }

  /**
   * Vence lotes EARN con `expiresAt <= now` (RN-099).
   *
   * @param userId - Titular.
   */
  async expireOverdueLots(userId: string): Promise<number> {
    const now = new Date();
    const expired = await this.ledgerRepo.find({
      where: {
        userId,
        type: PointLedgerType.EARN,
        expiresAt: LessThanOrEqual(now),
      },
      order: { expiresAt: 'ASC' },
    });

    let totalExpired = 0;
    for (const lot of expired) {
      if (lot.remaining <= 0) {
        continue;
      }
      const qty = lot.remaining;
      lot.remaining = 0;
      await this.ledgerRepo.save(lot);

      const balanceAfter = await this.availablePoints(userId);
      await this.ledgerRepo.save(
        this.ledgerRepo.create({
          userId,
          type: PointLedgerType.EXPIRE,
          points: qty,
          remaining: 0,
          expiresAt: null,
          orderId: lot.orderId,
          amountCop: null,
          description: `Vencimiento de lote (${POINTS_EXPIRY_MONTHS} meses, RN-099)`,
          balanceAfter,
        }),
      );
      totalExpired += qty;
    }
    return totalExpired;
  }

  /**
   * Debita puntos FIFO sobre lotes EARN y registra el movimiento.
   */
  private async debitFifo(
    userId: string,
    points: number,
    type: PointLedgerType.REDEEM_CART | PointLedgerType.REDEEM_WALLET,
    description: string,
    orderId: string | null,
    amountCop: number | null,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PointLedgerEntry);
      const now = new Date();
      const lots = await repo
        .createQueryBuilder('e')
        .where('e.userId = :userId', { userId })
        .andWhere('e.type = :type', { type: PointLedgerType.EARN })
        .andWhere('e.remaining > 0')
        .andWhere('(e.expiresAt IS NULL OR e.expiresAt > :now)', { now })
        .orderBy('e.expiresAt', 'ASC')
        .addOrderBy('e.createdAt', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      let left = points;
      for (const lot of lots) {
        if (left <= 0) {
          break;
        }
        const take = Math.min(lot.remaining, left);
        lot.remaining -= take;
        left -= take;
        await repo.save(lot);
      }
      if (left > 0) {
        throw new ConflictException({
          message: 'Puntos insuficientes',
          code: 'POINTS_INSUFFICIENT',
          required: points,
        });
      }

      const available = lots.reduce((acc, l) => acc + l.remaining, 0);
      /** Recalcula con lotes no tocados que no estaban en el lock set. */
      const extra = await repo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.remaining), 0)', 'sum')
        .where('e.userId = :userId', { userId })
        .andWhere('e.type = :type', { type: PointLedgerType.EARN })
        .andWhere('e.remaining > 0')
        .andWhere('(e.expiresAt IS NULL OR e.expiresAt > :now)', { now })
        .getRawOne<{ sum: string }>();
      const balanceAfter = Number(extra?.sum ?? available);

      await repo.save(
        repo.create({
          userId,
          type,
          points,
          remaining: 0,
          expiresAt: null,
          orderId,
          amountCop,
          description,
          balanceAfter,
        }),
      );
    });
  }

  /**
   * Recalcula y persiste el nivel según puntos de por vida (RN-101).
   * Solo sube (nunca baja en esta HU).
   */
  async recalculateLevel(userId: string): Promise<MembershipLevel> {
    const membership = await this.requireMembership(userId);
    const lifetime = await this.lifetimeEarned(userId);
    const target = this.levelForLifetime(lifetime);

    const currentIdx = LEVEL_ORDER.indexOf(membership.level);
    const targetIdx = LEVEL_ORDER.indexOf(target);
    if (targetIdx > currentIdx) {
      membership.level = target;
      await this.membershipRepo.save(membership);
    }
    return membership.level;
  }

  /**
   * Nivel máximo alcanzado según lifetime earned.
   */
  levelForLifetime(lifetimeEarned: number): MembershipLevel {
    let level = MembershipLevel.BRONZE;
    for (const candidate of LEVEL_ORDER) {
      if (lifetimeEarned >= LEVEL_LIFETIME_THRESHOLDS[candidate]) {
        level = candidate;
      }
    }
    return level;
  }

  private nextLevelProgress(
    lifetimeEarned: number,
    current: MembershipLevel,
  ): { nextLevel: MembershipLevel | null; pointsToNextLevel: number | null } {
    const idx = LEVEL_ORDER.indexOf(current);
    if (idx < 0 || idx >= LEVEL_ORDER.length - 1) {
      return { nextLevel: null, pointsToNextLevel: null };
    }
    const nextLevel = LEVEL_ORDER[idx + 1]!;
    const need = LEVEL_LIFETIME_THRESHOLDS[nextLevel];
    return {
      nextLevel,
      pointsToNextLevel: Math.max(0, need - lifetimeEarned),
    };
  }

  private async requireMembership(userId: string): Promise<Membership> {
    const membership = await this.membershipRepo.findOne({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException(
        `Membresía no encontrada para el usuario: ${userId}`,
      );
    }
    return membership;
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private toHistoryItem(row: PointLedgerEntry): PointsHistoryItem {
    return {
      id: row.id,
      type: row.type,
      points: row.points,
      remaining: row.remaining,
      amountCop: row.amountCop != null ? Number(row.amountCop) : null,
      orderId: row.orderId,
      description: row.description,
      balanceAfter: row.balanceAfter,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
