import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { benefitsForLevel } from '../membership/membership-benefits';
import { MembershipService } from '../membership/membership.service';
import { Showtime } from '../movies/entities/showtime.entity';
import { SeatsService } from '../seats/seats.service';
import {
  CartResponse,
  CartSnackView,
  CartSummary,
  CartTicketView,
  DeleteCartResult,
} from './dto/cart-response';
import {
  ApplyPromoDto,
  CreateCartDto,
  DEMO_PROMOS,
  UpdateCartDto,
  UpsertCartSnackDto,
} from './dto/cart.dto';
import { CartSnackItem } from './entities/cart-snack-item.entity';
import { CartTicketItem } from './entities/cart-ticket-item.entity';
import { Cart } from './entities/cart.entity';
import { CartStatus } from './enums/cart.enums';

/** TTL del carrito sin actividad (RN-046): 10 minutos. */
export const CART_TTL_MS = 10 * 60 * 1000;

/** IVA educativo sobre base gravable. */
export const CART_TAX_RATE = 0.19;

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
 * Administración del carrito de compras (HU-011).
 *
 * RN-044 un ACTIVE por usuario · RN-045 extiende locks de sillas ·
 * RN-046 expira a los 10 min · RN-047 descuento membresía ·
 * RN-048 promos no apilables según configuración.
 *
 * Separado de `SeatsService` (locks) y de pagos (HU-013) por SRP.
 */
@Injectable()
export class CartService {
  /**
   * @param cartRepo - Persistencia del carrito.
   * @param ticketRepo - Líneas de entrada.
   * @param snackRepo - Líneas de confitería.
   * @param showtimeRepo - Snapshot película/formato/sala.
   * @param seatsService - Reservas / TTL de sillas (HU-010).
   * @param membershipService - Nivel y beneficios (RN-047).
   */
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartTicketItem)
    private readonly ticketRepo: Repository<CartTicketItem>,
    @InjectRepository(CartSnackItem)
    private readonly snackRepo: Repository<CartSnackItem>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    private readonly seatsService: SeatsService,
    private readonly membershipService: MembershipService,
  ) {}

  /**
   * `POST /cart`: crea (o recrea) el carrito desde la reserva de sillas.
   *
   * Si ya hay un ACTIVE distinto (RN-044), se cancela y se libera;
   * si es la misma reserva vigente, solo renueva actividad.
   *
   * @param userId - Usuario del JWT.
   * @param dto - `reservationId` opcional.
   * @returns {Promise<CartResponse>} Carrito con totales.
   */
  async create(userId: string, dto: CreateCartDto = {}): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);

    const reservations = await this.seatsService.listMyReservations(userId);
    if (reservations.length === 0) {
      throw new BadRequestException(
        'No hay sillas bloqueadas: selecciona asientos antes de crear el carrito (HU-010)',
      );
    }

    let reservation = reservations[0]!;
    if (dto.reservationId) {
      const found = reservations.find(
        (r) => r.reservationId === dto.reservationId,
      );
      if (!found) {
        throw new NotFoundException(
          `Reserva no encontrada o expirada: ${dto.reservationId}`,
        );
      }
      reservation = found;
    } else if (reservations.length > 1) {
      throw new BadRequestException(
        'Hay varias reservas activas: indica reservationId en el body',
      );
    }

    const existing = await this.findActiveEntity(userId);
    if (existing) {
      if (
        existing.reservationId === reservation.reservationId &&
        existing.expiresAt.getTime() > Date.now()
      ) {
        return this.touchAndRespond(existing);
      }
      await this.cancelCartEntity(existing, true);
    }

    const showtime = await this.loadShowtimeSnapshot(reservation.functionId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CART_TTL_MS);

    const cart = this.cartRepo.create({
      userId,
      status: CartStatus.ACTIVE,
      reservationId: reservation.reservationId,
      showtimeId: reservation.functionId,
      expiresAt,
      lastActivityAt: now,
      membershipDiscountApplied: true,
      promoCode: null,
      promoDiscountAmount: 0,
      promoStackable: null,
      giftcardCode: null,
      giftcardAmount: 0,
      tickets: reservation.summary.seats.map((seat) =>
        this.ticketRepo.create({
          showtimeId: showtime.id,
          seatId: seat.id,
          seatLabel: seat.label,
          movieId: showtime.movieId,
          movieTitle: showtime.movie.title,
          startsAt: showtime.startsAt,
          roomName: showtime.room.name,
          cinemaName: showtime.room.cinema.name,
          format: showtime.format,
          language: showtime.language,
          unitPrice: seat.unitPrice,
        }),
      ),
      snacks: [],
    });

    const saved = await this.cartRepo.save(cart);
    await this.seatsService.extendReservationExpiry(
      userId,
      saved.reservationId,
      expiresAt,
    );

    return this.toResponse(saved, userId);
  }

  /**
   * `GET /cart`: carrito ACTIVE del usuario (renueva actividad RN-046).
   *
   * @param userId - Usuario del JWT.
   * @returns {Promise<CartResponse>} Carrito vigente.
   */
  async getActive(userId: string): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);
    return this.touchAndRespond(cart);
  }

  /**
   * `PUT /cart`: quitar sillas y/o reemplazar confitería.
   *
   * @param userId - Usuario del JWT.
   * @param dto - Cambios a aplicar.
   * @returns {Promise<CartResponse>} Carrito actualizado.
   */
  async update(userId: string, dto: UpdateCartDto): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    if (!dto.removeSeatIds?.length && dto.snacks === undefined) {
      throw new BadRequestException(
        'Indica removeSeatIds y/o snacks para modificar el carrito',
      );
    }

    if (dto.removeSeatIds && dto.removeSeatIds.length > 0) {
      const removeSet = new Set(dto.removeSeatIds);
      const toRemove = cart.tickets.filter((t) => removeSet.has(t.seatId));
      if (toRemove.length !== dto.removeSeatIds.length) {
        throw new BadRequestException(
          'Una o más sillas no pertenecen al carrito activo',
        );
      }
      if (toRemove.length >= cart.tickets.length) {
        throw new BadRequestException(
          'No puedes quitar todas las entradas: elimina el carrito con DELETE /cart',
        );
      }

      await this.seatsService.releaseSeatsByIds(
        userId,
        cart.reservationId,
        dto.removeSeatIds,
      );
      await this.ticketRepo.remove(toRemove);
      cart.tickets = cart.tickets.filter((t) => !removeSet.has(t.seatId));
    }

    if (dto.snacks !== undefined) {
      await this.replaceSnacks(cart, dto.snacks);
    }

    return this.touchAndRespond(cart);
  }

  /**
   * `DELETE /cart`: cancela el carrito y libera sillas (RN-040/045).
   *
   * @param userId - Usuario del JWT.
   * @returns {Promise<DeleteCartResult>} Estado final.
   */
  async delete(userId: string): Promise<DeleteCartResult> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    const seatsReleased = await this.cancelCartEntity(cart, true);
    return {
      cartId: cart.id,
      status: CartStatus.CANCELLED,
      seatsReleased,
    };
  }

  /**
   * `POST /cart/apply-membership`: fuerza descuento de membresía (RN-047).
   *
   * @param userId - Usuario del JWT.
   * @returns {Promise<CartResponse>} Carrito con descuento activo.
   */
  async applyMembership(userId: string): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);
    cart.membershipDiscountApplied = true;
    return this.touchAndRespond(cart);
  }

  /**
   * `POST /cart/apply-promo`: aplica cupón demo (RN-048 / stub HU-026).
   *
   * @param userId - Usuario del JWT.
   * @param dto - Código de promoción.
   * @returns {Promise<CartResponse>} Carrito con promo.
   */
  async applyPromo(userId: string, dto: ApplyPromoDto): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    const code = dto.code.trim().toUpperCase();
    const promo = DEMO_PROMOS[code];
    if (!promo) {
      throw new NotFoundException(
        `Promoción no encontrada: ${code} (catálogo admin = HU-026)`,
      );
    }

    if (cart.promoCode && cart.promoCode !== code) {
      if (cart.promoStackable === false || !promo.stackable) {
        throw new ConflictException(
          'Las promociones no se pueden combinar (RN-048)',
        );
      }
      cart.promoDiscountAmount =
        Number(cart.promoDiscountAmount) + promo.discountAmount;
      cart.promoCode = `${cart.promoCode}+${code}`;
      cart.promoStackable = cart.promoStackable && promo.stackable;
    } else {
      cart.promoCode = code;
      cart.promoDiscountAmount = promo.discountAmount;
      cart.promoStackable = promo.stackable;
    }

    return this.touchAndRespond(cart);
  }

  /**
   * Expira carritos ACTIVE vencidos y libera sillas (RN-046).
   *
   * @param userId - Opcional: limita al usuario (lazy por request).
   * @returns {Promise<number>} Carritos expirados.
   */
  async expireOverdueCarts(userId?: string): Promise<number> {
    const qb = this.cartRepo
      .createQueryBuilder('cart')
      .leftJoinAndSelect('cart.tickets', 'tickets')
      .leftJoinAndSelect('cart.snacks', 'snacks')
      .where('cart.status = :status', { status: CartStatus.ACTIVE })
      .andWhere('cart.expiresAt <= :now', { now: new Date() });

    if (userId) {
      qb.andWhere('cart.userId = :userId', { userId });
    }

    const overdue = await qb.getMany();
    for (const cart of overdue) {
      await this.cancelCartEntity(cart, true, CartStatus.EXPIRED);
    }
    return overdue.length;
  }

  /**
   * Renueva TTL del carrito + locks y devuelve la vista.
   */
  private async touchAndRespond(cart: Cart): Promise<CartResponse> {
    const now = new Date();
    cart.lastActivityAt = now;
    cart.expiresAt = new Date(now.getTime() + CART_TTL_MS);
    const saved = await this.cartRepo.save(cart);
    await this.seatsService.extendReservationExpiry(
      saved.userId,
      saved.reservationId,
      saved.expiresAt,
    );
    return this.toResponse(saved, saved.userId);
  }

  /**
   * Marca carrito CANCELLED/EXPIRED y opcionalmente libera sillas.
   */
  private async cancelCartEntity(
    cart: Cart,
    releaseSeats: boolean,
    status: CartStatus.CANCELLED | CartStatus.EXPIRED = CartStatus.CANCELLED,
  ): Promise<number> {
    cart.status = status;
    await this.cartRepo.save(cart);
    if (!releaseSeats) {
      return 0;
    }
    const result = await this.seatsService.releaseSeats(
      cart.userId,
      cart.reservationId,
    );
    return result.releasedCount;
  }

  private async findActiveEntity(userId: string): Promise<Cart | null> {
    return this.cartRepo.findOne({
      where: { userId, status: CartStatus.ACTIVE },
      relations: { tickets: true, snacks: true },
    });
  }

  private async requireActiveCart(userId: string): Promise<Cart> {
    const cart = await this.findActiveEntity(userId);
    if (!cart) {
      throw new NotFoundException(
        'No hay un carrito activo. Crea uno con POST /cart tras seleccionar sillas.',
      );
    }
    return cart;
  }

  /**
   * Si los locks ya no existen, el carrito no puede seguir ACTIVE (RN-045).
   */
  private async assertLocksStillHeld(cart: Cart): Promise<void> {
    const reservations = await this.seatsService.listMyReservations(
      cart.userId,
    );
    const still = reservations.find(
      (r) => r.reservationId === cart.reservationId,
    );
    if (!still) {
      cart.status = CartStatus.EXPIRED;
      await this.cartRepo.save(cart);
      throw new ConflictException(
        'Las sillas del carrito ya no están reservadas; el carrito expiró (RN-045/046)',
      );
    }
  }

  private async replaceSnacks(
    cart: Cart,
    snacks: UpsertCartSnackDto[],
  ): Promise<void> {
    for (const snack of snacks) {
      if (snack.quantity < 1) {
        throw new BadRequestException(
          'No se permiten cantidades negativas o cero',
        );
      }
      if (snack.unitPrice < 0) {
        throw new BadRequestException('unitPrice no puede ser negativo');
      }
    }

    if (cart.snacks?.length) {
      await this.snackRepo.remove(cart.snacks);
    }

    cart.snacks = snacks.map((s) =>
      this.snackRepo.create({
        cartId: cart.id,
        snackId: s.snackId,
        name: s.name,
        imageUrl: s.imageUrl ?? null,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
      }),
    );
  }

  /**
   * Carga función con película, sala y cine para el snapshot del ticket.
   */
  private async loadShowtimeSnapshot(functionId: string): Promise<Showtime> {
    const showtime = await this.showtimeRepo.findOne({
      where: { id: functionId },
      relations: { movie: true, room: { cinema: true } },
    });
    if (!showtime) {
      throw new NotFoundException(`Función no encontrada: ${functionId}`);
    }
    return showtime;
  }

  private async toResponse(cart: Cart, userId: string): Promise<CartResponse> {
    const membership = await this.membershipService.findByUserId(userId);
    const level = membership?.level ?? null;
    const benefits = level ? benefitsForLevel(level) : [];
    const ticketPct = cart.membershipDiscountApplied
      ? this.discountPercent(benefits, 'TICKET')
      : 0;
    const snackPct = cart.membershipDiscountApplied
      ? this.discountPercent(benefits, 'SNACK')
      : 0;

    const ticketViews: CartTicketView[] = (cart.tickets ?? []).map((t) => {
      const unit = Number(t.unitPrice);
      const membershipDiscount = money(unit * (ticketPct / 100));
      return {
        id: t.id,
        seatId: t.seatId,
        seatLabel: t.seatLabel,
        movieId: t.movieId,
        movieTitle: t.movieTitle,
        startsAt: t.startsAt.toISOString(),
        roomName: t.roomName,
        cinemaName: t.cinemaName,
        format: t.format,
        language: t.language,
        unitPrice: unit,
        membershipDiscount,
        lineTotal: money(unit - membershipDiscount),
      };
    });

    const snackViews: CartSnackView[] = (cart.snacks ?? []).map((s) => {
      const unit = Number(s.unitPrice);
      const gross = unit * s.quantity;
      const membershipDiscount = money(gross * (snackPct / 100));
      return {
        id: s.id,
        snackId: s.snackId,
        name: s.name,
        imageUrl: s.imageUrl,
        quantity: s.quantity,
        unitPrice: unit,
        membershipDiscount,
        lineTotal: money(gross - membershipDiscount),
      };
    });

    const ticketsSubtotal = money(
      ticketViews.reduce((acc, t) => acc + t.unitPrice, 0),
    );
    const snacksSubtotal = money(
      snackViews.reduce((acc, s) => acc + s.unitPrice * s.quantity, 0),
    );
    const subtotal = money(ticketsSubtotal + snacksSubtotal);
    const membershipDiscount = money(
      ticketViews.reduce((acc, t) => acc + t.membershipDiscount, 0) +
        snackViews.reduce((acc, s) => acc + s.membershipDiscount, 0),
    );
    const promoDiscount = money(Number(cart.promoDiscountAmount));
    const giftcardAmount = money(Number(cart.giftcardAmount));
    const afterDiscounts = Math.max(
      0,
      money(subtotal - membershipDiscount - promoDiscount),
    );
    const tax = money(afterDiscounts * CART_TAX_RATE);
    const total = Math.max(0, money(afterDiscounts + tax - giftcardAmount));

    const summary: CartSummary = {
      currency: 'COP',
      ticketsSubtotal,
      snacksSubtotal,
      subtotal,
      membershipDiscount,
      promoDiscount,
      giftcardAmount,
      tax,
      taxRate: CART_TAX_RATE,
      total,
      seatCount: ticketViews.length,
      snackCount: snackViews.reduce((acc, s) => acc + s.quantity, 0),
    };

    return {
      id: cart.id,
      status: cart.status,
      reservationId: cart.reservationId,
      showtimeId: cart.showtimeId,
      expiresAt: cart.expiresAt.toISOString(),
      lastActivityAt: cart.lastActivityAt.toISOString(),
      membershipDiscountApplied: cart.membershipDiscountApplied,
      membership: {
        level,
        ticketDiscountPercent: ticketPct,
        snackDiscountPercent: snackPct,
      },
      promo: {
        code: cart.promoCode,
        discountAmount: promoDiscount,
        stackable: cart.promoStackable,
      },
      giftcard: {
        code: cart.giftcardCode,
        amount: giftcardAmount,
      },
      tickets: ticketViews,
      snacks: snackViews,
      summary,
      createdAt: cart.createdAt.toISOString(),
    };
  }

  /**
   * Mayor % de beneficio cuyo code empieza por el prefijo (`TICKET`/`SNACK`).
   */
  private discountPercent(
    benefits: ReturnType<typeof benefitsForLevel>,
    prefix: 'TICKET' | 'SNACK',
  ): number {
    const matches = benefits.filter((b) => b.code.startsWith(prefix));
    if (matches.length === 0) {
      return 0;
    }
    return Math.max(...matches.map((b) => b.discountPercent));
  }
}
