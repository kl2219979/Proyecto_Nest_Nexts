import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminPage,
  AdminPaginationQueryDto,
} from '../admin/dto/admin-pagination.dto';
import { UserProfile } from '../auth/entities/user-profile.entity';
import {
  MembershipLevel,
  MembershipStatus,
} from '../membership/enums/membership.enums';
import { Membership } from '../membership/entities/membership.entity';
import { MovieFormat } from '../movies/enums/movie.enums';
import { Showtime } from '../movies/entities/showtime.entity';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import {
  FunctionPromotionView,
  PromoApplicationResult,
  PromoEvaluationContext,
  PromotionResponse,
} from './dto/promotion-response';
import { PromotionRedemption } from './entities/promotion-redemption.entity';
import { Promotion } from './entities/promotion.entity';
import { DiscountKind, PromotionType } from './enums/promotion.enums';

/** Ranking de niveles para `minMembershipLevel`. */
const LEVEL_RANK: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONZE]: 0,
  [MembershipLevel.SILVER]: 1,
  [MembershipLevel.GOLD]: 2,
  [MembershipLevel.PLATINUM]: 3,
};

/**
 * Redondea a 2 decimales (COP).
 *
 * @param value - Monto crudo.
 * @returns Monto redondeado.
 */
function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Servicio de promociones y cupones (HU-026).
 *
 * CRUD admin + motor de evaluación (vigencia, scopes, apilabilidad,
 * tope por usuario) y cálculo de descuento para carrito / precios.
 *
 * @remarks
 * **Patrón:** Service (aplicación) + Strategy implícita vía `DiscountKind`.
 * Problema que resuelve: unificar reglas RN-105…107 y RN-048/038 sin
 * cupones hardcodeados en el carrito.
 */
@Injectable()
export class PromotionsService {
  /**
   * @param promoRepo - Catálogo de promociones.
   * @param redemptionRepo - Historial de usos (RN-107).
   * @param showtimeRepo - Contexto de función para scopes.
   * @param membershipRepo - Nivel de socio (tipo MEMBERSHIP).
   * @param profileRepo - Fecha de nacimiento (tipo BIRTHDAY).
   */
  constructor(
    @InjectRepository(Promotion)
    private readonly promoRepo: Repository<Promotion>,
    @InjectRepository(PromotionRedemption)
    private readonly redemptionRepo: Repository<PromotionRedemption>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  // ── CRUD admin ──────────────────────────────────────────────

  /**
   * Lista paginada de promociones (backoffice).
   *
   * @param query - Página / búsqueda por código o nombre.
   * @returns Página de promociones.
   */
  async listAdmin(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPage<PromotionResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.promoRepo
      .createQueryBuilder('p')
      .orderBy('p.startsAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.q) {
      qb.andWhere('(p.code ILIKE :q OR p.name ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((p) => this.toResponse(p)),
      page,
      limit,
      total,
    };
  }

  /**
   * Detalle admin por id.
   *
   * @param id - UUID.
   * @returns Promoción.
   */
  async getById(id: string): Promise<PromotionResponse> {
    const promo = await this.requireById(id);
    return this.toResponse(promo);
  }

  /**
   * Crea una promoción / cupón.
   *
   * @param dto - Datos de configuración.
   * @returns Promoción creada.
   */
  async create(dto: CreatePromotionDto): Promise<PromotionResponse> {
    this.assertDiscountConfig(dto.discountKind, dto.discountValue);
    this.assertDateRange(dto.startsAt, dto.endsAt);

    const code = this.normalizeCode(dto.code);
    if (code) {
      await this.assertCodeAvailable(code);
    }

    const promo = this.promoRepo.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      type: dto.type,
      discountKind: dto.discountKind,
      discountValue: dto.discountValue,
      stackable: dto.stackable ?? false,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      maxUsesPerUser: dto.maxUsesPerUser ?? null,
      maxTotalUses: dto.maxTotalUses ?? null,
      isActive: dto.isActive ?? true,
      requiresCode: dto.requiresCode ?? true,
      cityId: dto.cityId ?? null,
      cinemaId: dto.cinemaId ?? null,
      roomId: dto.roomId ?? null,
      movieId: dto.movieId ?? null,
      genreId: dto.genreId ?? null,
      format: dto.format ?? null,
      appliesToTickets: dto.appliesToTickets ?? true,
      appliesToSnacks: dto.appliesToSnacks ?? false,
      minMembershipLevel: dto.minMembershipLevel ?? null,
      birthdayWindowDays: dto.birthdayWindowDays ?? 0,
      incompatibleWithPoints: dto.incompatibleWithPoints ?? false,
    });

    const saved = await this.promoRepo.save(promo);
    return this.toResponse(saved);
  }

  /**
   * Actualiza una promoción existente.
   *
   * @param id - UUID.
   * @param dto - Campos a cambiar.
   * @returns Promoción actualizada.
   */
  async update(
    id: string,
    dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    const promo = await this.requireById(id);

    if (dto.discountKind !== undefined || dto.discountValue !== undefined) {
      this.assertDiscountConfig(
        dto.discountKind ?? promo.discountKind,
        dto.discountValue ?? Number(promo.discountValue),
      );
    }

    const startsAt = dto.startsAt ?? promo.startsAt;
    const endsAt = dto.endsAt ?? promo.endsAt;
    this.assertDateRange(startsAt, endsAt);

    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (code && code !== promo.code) {
        await this.assertCodeAvailable(code, id);
      }
      promo.code = code;
    }

    if (dto.name !== undefined) promo.name = dto.name.trim();
    if (dto.description !== undefined) {
      promo.description = dto.description?.trim() ?? null;
    }
    if (dto.type !== undefined) promo.type = dto.type;
    if (dto.discountKind !== undefined) promo.discountKind = dto.discountKind;
    if (dto.discountValue !== undefined) promo.discountValue = dto.discountValue;
    if (dto.stackable !== undefined) promo.stackable = dto.stackable;
    if (dto.startsAt !== undefined) promo.startsAt = dto.startsAt;
    if (dto.endsAt !== undefined) promo.endsAt = dto.endsAt;
    if (dto.maxUsesPerUser !== undefined) {
      promo.maxUsesPerUser = dto.maxUsesPerUser;
    }
    if (dto.maxTotalUses !== undefined) promo.maxTotalUses = dto.maxTotalUses;
    if (dto.isActive !== undefined) promo.isActive = dto.isActive;
    if (dto.requiresCode !== undefined) promo.requiresCode = dto.requiresCode;
    if (dto.cityId !== undefined) promo.cityId = dto.cityId;
    if (dto.cinemaId !== undefined) promo.cinemaId = dto.cinemaId;
    if (dto.roomId !== undefined) promo.roomId = dto.roomId;
    if (dto.movieId !== undefined) promo.movieId = dto.movieId;
    if (dto.genreId !== undefined) promo.genreId = dto.genreId;
    if (dto.format !== undefined) promo.format = dto.format;
    if (dto.appliesToTickets !== undefined) {
      promo.appliesToTickets = dto.appliesToTickets;
    }
    if (dto.appliesToSnacks !== undefined) {
      promo.appliesToSnacks = dto.appliesToSnacks;
    }
    if (dto.minMembershipLevel !== undefined) {
      promo.minMembershipLevel = dto.minMembershipLevel;
    }
    if (dto.birthdayWindowDays !== undefined) {
      promo.birthdayWindowDays = dto.birthdayWindowDays;
    }
    if (dto.incompatibleWithPoints !== undefined) {
      promo.incompatibleWithPoints = dto.incompatibleWithPoints;
    }

    const saved = await this.promoRepo.save(promo);
    return this.toResponse(saved);
  }

  /**
   * Desactiva una promoción (soft delete administrativo).
   *
   * @param id - UUID.
   * @returns Promoción desactivada.
   */
  async remove(id: string): Promise<PromotionResponse> {
    const promo = await this.requireById(id);
    promo.isActive = false;
    const saved = await this.promoRepo.save(promo);
    return this.toResponse(saved);
  }

  /**
   * Lista promociones activas y vigentes (catálogo público).
   *
   * @returns Promociones visibles.
   */
  async listActivePublic(): Promise<PromotionResponse[]> {
    const now = new Date();
    const items = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.startsAt <= :now', { now })
      .andWhere('p.endsAt >= :now', { now })
      .orderBy('p.startsAt', 'DESC')
      .getMany();
    return items.map((p) => this.toResponse(p));
  }

  // ── Motor: carrito / precios ────────────────────────────────

  /**
   * Aplica un cupón al contexto de un carrito (RN-048 / RN-105…107).
   *
   * @param code - Código ingresado por el usuario.
   * @param ctx - Totales y scopes de la compra.
   * @param current - Promo ya aplicada en el carrito (si hay).
   * @returns Resultado con monto a descontar.
   */
  async applyCodeToCart(
    code: string,
    ctx: PromoEvaluationContext,
    current?: {
      code: string | null;
      discountAmount: number;
      stackable: boolean | null;
    },
  ): Promise<PromoApplicationResult> {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      throw new BadRequestException('Código de promoción vacío');
    }

    const promo = await this.promoRepo.findOne({
      where: { code: normalized },
    });
    if (!promo || !promo.isActive) {
      throw new NotFoundException(`Promoción no encontrada: ${normalized}`);
    }

    await this.assertApplicable(promo, ctx);

    if (current?.code && current.code !== normalized) {
      const alreadyCodes = current.code.split('+');
      if (alreadyCodes.includes(normalized)) {
        throw new ConflictException(`La promoción ${normalized} ya está aplicada`);
      }
      if (current.stackable === false || !promo.stackable) {
        throw new ConflictException(
          'Las promociones no se pueden combinar (RN-048 / RN-105)',
        );
      }
    }

    const discountAmount = this.calculateDiscount(promo, ctx);
    if (discountAmount <= 0) {
      throw new BadRequestException(
        'La promoción no genera descuento en este carrito',
      );
    }

    return {
      promotionId: promo.id,
      code: promo.code,
      name: promo.name,
      discountAmount,
      stackable: promo.stackable,
      description: promo.description,
      incompatibleWithPoints: promo.incompatibleWithPoints,
    };
  }

  /**
   * Promociones automáticas (sin código) aplicables a una función (RN-038).
   *
   * @param functionId - UUID del showtime.
   * @param basePrice - Precio unitario de la entrada.
   * @returns Lista con descuento estimado por entrada.
   */
  async listForFunction(
    functionId: string,
    basePrice: number,
  ): Promise<FunctionPromotionView[]> {
    const showtime = await this.showtimeRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .innerJoinAndSelect('s.movie', 'movie')
      .leftJoinAndSelect('movie.genres', 'genres')
      .where('s.id = :functionId', { functionId })
      .getOne();

    if (!showtime) {
      return [];
    }

    const now = new Date();
    const promos = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.requiresCode = false')
      .andWhere('p.startsAt <= :now', { now })
      .andWhere('p.endsAt >= :now', { now })
      .andWhere('p.appliesToTickets = true')
      .getMany();

    const genreIds = (showtime.movie.genres ?? []).map((g) => g.id);
    const ctx: PromoEvaluationContext = {
      userId: '',
      now,
      ticketsSubtotal: basePrice,
      snacksSubtotal: 0,
      ticketUnitPrices: [basePrice],
      cityId: showtime.room.cinema.cityId,
      cinemaId: showtime.room.cinema.id,
      roomId: showtime.room.id,
      movieId: showtime.movieId,
      genreIds,
      format: showtime.format,
    };

    const views: FunctionPromotionView[] = [];
    for (const promo of promos) {
      if (!this.matchesScopes(promo, ctx)) {
        continue;
      }
      if (promo.type === PromotionType.BIRTHDAY) {
        continue;
      }
      if (promo.type === PromotionType.MEMBERSHIP && promo.minMembershipLevel) {
        continue;
      }
      const discountAmount = this.calculateDiscount(promo, ctx);
      if (discountAmount <= 0) {
        continue;
      }
      views.push({
        code: promo.code,
        name: promo.name,
        description: promo.description ?? promo.name,
        discountAmount,
        discountKind: promo.discountKind,
        discountValue: Number(promo.discountValue),
        stackable: promo.stackable,
        type: promo.type,
      });
    }
    return views;
  }

  /**
   * Arma el contexto de evaluación desde un showtime + usuario.
   *
   * @param userId - JWT.
   * @param showtimeId - Función del carrito.
   * @param ticketsSubtotal - Subtotal entradas.
   * @param snacksSubtotal - Subtotal snacks.
   * @param ticketUnitPrices - Precios unitarios.
   * @returns Contexto listo para `applyCodeToCart`.
   */
  async buildCartContext(
    userId: string,
    showtimeId: string,
    ticketsSubtotal: number,
    snacksSubtotal: number,
    ticketUnitPrices: number[],
  ): Promise<PromoEvaluationContext> {
    const showtime = await this.showtimeRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .innerJoinAndSelect('s.movie', 'movie')
      .leftJoinAndSelect('movie.genres', 'genres')
      .where('s.id = :showtimeId', { showtimeId })
      .getOne();

    if (!showtime) {
      throw new NotFoundException(`Función no encontrada: ${showtimeId}`);
    }

    const membership = await this.membershipRepo.findOne({
      where: { userId, status: MembershipStatus.ACTIVE },
    });
    const profile = await this.profileRepo.findOne({ where: { userId } });

    return {
      userId,
      ticketsSubtotal,
      snacksSubtotal,
      ticketUnitPrices,
      cityId: showtime.room.cinema.cityId,
      cinemaId: showtime.room.cinema.id,
      roomId: showtime.room.id,
      movieId: showtime.movieId,
      genreIds: (showtime.movie.genres ?? []).map((g) => g.id),
      format: showtime.format,
      membershipLevel: membership?.level ?? null,
      birthDate: profile?.birthDate ?? null,
    };
  }

  /**
   * Registra redenciones al confirmar pago (RN-107).
   *
   * Soporta códigos apilados separados por `+`.
   *
   * @param userId - Comprador.
   * @param orderId - Orden PAID.
   * @param promoCode - Código(s) del carrito/orden.
   * @param totalDiscount - Monto total descontado (se reparte equitativo).
   */
  async recordRedemptions(
    userId: string,
    orderId: string,
    promoCode: string | null,
    totalDiscount: number,
  ): Promise<void> {
    if (!promoCode?.trim() || totalDiscount <= 0) {
      return;
    }
    const codes = promoCode
      .split('+')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (codes.length === 0) {
      return;
    }
    const perCode = money(totalDiscount / codes.length);
    for (const code of codes) {
      const promo = await this.promoRepo.findOne({ where: { code } });
      if (!promo) {
        continue;
      }
      await this.redemptionRepo.save(
        this.redemptionRepo.create({
          promotionId: promo.id,
          userId,
          orderId,
          codeApplied: code,
          discountAmount: perCode,
        }),
      );
    }
  }

  // ── Reglas internas ─────────────────────────────────────────

  /**
   * Valida vigencia, cupos y scopes (RN-105…107).
   *
   * @param promo - Promoción candidata.
   * @param ctx - Contexto de compra.
   */
  private async assertApplicable(
    promo: Promotion,
    ctx: PromoEvaluationContext,
  ): Promise<void> {
    const now = ctx.now ?? new Date();

    if (!promo.isActive) {
      throw new BadRequestException('La promoción está inactiva');
    }
    if (now < promo.startsAt || now > promo.endsAt) {
      throw new BadRequestException(
        'La promoción está fuera de vigencia (RN-106)',
      );
    }

    if (!this.matchesScopes(promo, ctx)) {
      throw new BadRequestException(
        'La promoción no aplica a esta función / ubicación',
      );
    }

    if (promo.type === PromotionType.BIRTHDAY) {
      if (!ctx.birthDate) {
        throw new BadRequestException(
          'Se requiere fecha de nacimiento para esta promoción',
        );
      }
      if (!this.isBirthdayEligible(ctx.birthDate, promo.birthdayWindowDays, now)) {
        throw new BadRequestException(
          'La promoción de cumpleaños no aplica en esta fecha',
        );
      }
    }

    if (promo.type === PromotionType.MEMBERSHIP) {
      if (!ctx.membershipLevel) {
        throw new BadRequestException('Se requiere membresía activa');
      }
      if (
        promo.minMembershipLevel &&
        LEVEL_RANK[ctx.membershipLevel] <
          LEVEL_RANK[promo.minMembershipLevel]
      ) {
        throw new BadRequestException(
          `Nivel de membresía insuficiente (mínimo ${promo.minMembershipLevel})`,
        );
      }
    }

    if (ctx.userId) {
      await this.assertUsageLimits(promo, ctx.userId);
    }
  }

  /**
   * Comprueba tope por usuario y global (RN-107).
   *
   * @param promo - Promoción.
   * @param userId - Usuario.
   */
  private async assertUsageLimits(
    promo: Promotion,
    userId: string,
  ): Promise<void> {
    if (promo.maxUsesPerUser != null) {
      const usedByUser = await this.redemptionRepo.count({
        where: { promotionId: promo.id, userId },
      });
      if (usedByUser >= promo.maxUsesPerUser) {
        throw new ConflictException(
          `Alcanzaste el máximo de usos de esta promoción (RN-107: ${promo.maxUsesPerUser})`,
        );
      }
    }
    if (promo.maxTotalUses != null) {
      const totalUsed = await this.redemptionRepo.count({
        where: { promotionId: promo.id },
      });
      if (totalUsed >= promo.maxTotalUses) {
        throw new ConflictException(
          'La promoción agotó su cupo global de usos',
        );
      }
    }
  }

  /**
   * ¿La promo coincide con ciudad/cine/sala/película/género/formato?
   *
   * @param promo - Reglas de scope.
   * @param ctx - Contexto.
   * @returns true si aplica.
   */
  private matchesScopes(
    promo: Promotion,
    ctx: PromoEvaluationContext,
  ): boolean {
    if (promo.cityId && promo.cityId !== ctx.cityId) return false;
    if (promo.cinemaId && promo.cinemaId !== ctx.cinemaId) return false;
    if (promo.roomId && promo.roomId !== ctx.roomId) return false;
    if (promo.movieId && promo.movieId !== ctx.movieId) return false;
    if (promo.format && promo.format !== ctx.format) return false;
    if (promo.genreId) {
      const genres = ctx.genreIds ?? [];
      if (!genres.includes(promo.genreId)) return false;
    }
    return true;
  }

  /**
   * Calcula el monto de descuento según `DiscountKind`.
   *
   * @param promo - Promoción.
   * @param ctx - Totales del carrito / precio unitario.
   * @returns Monto en COP (≥ 0).
   */
  calculateDiscount(promo: Promotion, ctx: PromoEvaluationContext): number {
    let base = 0;
    if (promo.appliesToTickets) {
      base += ctx.ticketsSubtotal;
    }
    if (promo.appliesToSnacks) {
      base += ctx.snacksSubtotal;
    }
    if (base <= 0 && promo.discountKind !== DiscountKind.TWO_FOR_ONE) {
      return 0;
    }

    switch (promo.discountKind) {
      case DiscountKind.PERCENT: {
        const pct = Number(promo.discountValue);
        return money(Math.min(base, (base * pct) / 100));
      }
      case DiscountKind.FIXED: {
        return money(Math.min(base, Number(promo.discountValue)));
      }
      case DiscountKind.TWO_FOR_ONE: {
        if (!promo.appliesToTickets) {
          return 0;
        }
        const prices = [...ctx.ticketUnitPrices].sort((a, b) => a - b);
        const pairs = Math.floor(prices.length / 2);
        if (pairs <= 0) {
          return 0;
        }
        // Por cada par, regala la más barata del par (tras ordenar asc).
        let discount = 0;
        for (let i = 0; i < pairs; i += 1) {
          discount += prices[i] ?? 0;
        }
        return money(discount);
      }
      default:
        return 0;
    }
  }

  /**
   * Cumpleaños: misma fecha (mes/día) o ventana ±N días.
   *
   * @param birthDate - `YYYY-MM-DD`.
   * @param windowDays - Días de holgura.
   * @param now - Fecha de referencia.
   * @returns true si es elegible.
   */
  private isBirthdayEligible(
    birthDate: string,
    windowDays: number,
    now: Date,
  ): boolean {
    const parts = birthDate.slice(0, 10).split('-').map(Number);
    const month = parts[1];
    const day = parts[2];
    if (!month || !day) {
      return false;
    }
    const year = now.getUTCFullYear();
    const bday = new Date(Date.UTC(year, month - 1, day));
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const diffMs = Math.abs(today.getTime() - bday.getTime());
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    // Si el cumpleaños ya pasó este año y window cruza año, comparar con ±1 año.
    const bdayPrev = new Date(Date.UTC(year - 1, month - 1, day));
    const bdayNext = new Date(Date.UTC(year + 1, month - 1, day));
    const diffs = [bday, bdayPrev, bdayNext].map((d) =>
      Math.round(Math.abs(today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const minDiff = Math.min(...diffs, diffDays);
    return minDiff <= windowDays;
  }

  /**
   * @param id - UUID.
   * @returns Entidad o 404.
   */
  private async requireById(id: string): Promise<Promotion> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) {
      throw new NotFoundException(`Promoción no encontrada: ${id}`);
    }
    return promo;
  }

  /**
   * @param code - Código normalizado.
   * @param excludeId - Id a excluir en update.
   */
  private async assertCodeAvailable(
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.promoRepo.findOne({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Ya existe una promoción con código ${code}`);
    }
  }

  /**
   * @param kind - Mecánica.
   * @param value - Valor.
   */
  private assertDiscountConfig(kind: DiscountKind, value: number): void {
    if (kind === DiscountKind.PERCENT && (value <= 0 || value > 100)) {
      throw new BadRequestException(
        'discountValue para PERCENT debe estar entre 0 y 100 (exclusivo 0)',
      );
    }
    if (kind === DiscountKind.FIXED && value <= 0) {
      throw new BadRequestException(
        'discountValue para FIXED debe ser mayor que 0',
      );
    }
  }

  /**
   * @param startsAt - Inicio.
   * @param endsAt - Fin.
   */
  private assertDateRange(startsAt: Date, endsAt: Date): void {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('endsAt debe ser posterior a startsAt');
    }
  }

  /**
   * @param code - Código crudo o null.
   * @returns Uppercase trim o null.
   */
  private normalizeCode(code?: string | null): string | null {
    if (code == null) {
      return null;
    }
    const trimmed = code.trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * @param promo - Entidad.
   * @returns DTO de respuesta.
   */
  private toResponse(promo: Promotion): PromotionResponse {
    return {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      description: promo.description,
      type: promo.type,
      discountKind: promo.discountKind,
      discountValue: Number(promo.discountValue),
      stackable: promo.stackable,
      startsAt: promo.startsAt.toISOString(),
      endsAt: promo.endsAt.toISOString(),
      maxUsesPerUser: promo.maxUsesPerUser,
      maxTotalUses: promo.maxTotalUses,
      isActive: promo.isActive,
      requiresCode: promo.requiresCode,
      cityId: promo.cityId,
      cinemaId: promo.cinemaId,
      roomId: promo.roomId,
      movieId: promo.movieId,
      genreId: promo.genreId,
      format: promo.format as MovieFormat | null,
      appliesToTickets: promo.appliesToTickets,
      appliesToSnacks: promo.appliesToSnacks,
      minMembershipLevel: promo.minMembershipLevel,
      birthdayWindowDays: promo.birthdayWindowDays,
      incompatibleWithPoints: promo.incompatibleWithPoints,
      createdAt: promo.createdAt.toISOString(),
      updatedAt: promo.updatedAt.toISOString(),
    };
  }
}
