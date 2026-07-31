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
import { SnacksService } from '../snacks/snacks.service';
import { PromotionsService } from '../promotions/promotions.service';
import { GiftcardsService } from '../giftcards/giftcards.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ApplyPointsDto } from '../loyalty/dto/loyalty.dto';
import {
  CartResponse,
  CartSnackView,
  CartSummary,
  CartTicketView,
  DeleteCartResult,
} from './dto/cart-response';
import {
  AddCartSnackDto,
  RemoveCartSnackDto,
  UpdateCartSnackDto,
} from './dto/cart-snacks.dto';
import {
  ApplyGiftcardDto,
  ApplyPromoDto,
  CreateCartDto,
  UpdateCartDto,
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
 * RN-048 / RN-105 promos según configuración administrativa (HU-026).
 *
 * Separado de `SeatsService` (locks) y de pagos (HU-013) por SRP.
 */
@Injectable()
export class CartService {
  /**
   * @param cartRepo - Persistencia del carrito.
   * @param ticketRepo - Líneas de entrada.
   * @param snackItemRepo - Líneas de confitería en el carrito.
   * @param showtimeRepo - Snapshot película/formato/sala.
   * @param seatsService - Reservas / TTL de sillas (HU-010).
   * @param membershipService - Nivel y beneficios (RN-047 / RN-051).
   * @param snacksService - Catálogo y stock (HU-012 / RN-049).
   * @param promotionsService - Cupones formales (HU-026).
   * @param giftcardsService - Bonos digitales (HU-018 / RN-079).
   * @param loyaltyService - Puntos de fidelización (HU-023).
   */
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartTicketItem)
    private readonly ticketRepo: Repository<CartTicketItem>,
    @InjectRepository(CartSnackItem)
    private readonly snackItemRepo: Repository<CartSnackItem>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    private readonly seatsService: SeatsService,
    private readonly membershipService: MembershipService,
    private readonly snacksService: SnacksService,
    private readonly promotionsService: PromotionsService,
    private readonly giftcardsService: GiftcardsService,
    private readonly loyaltyService: LoyaltyService,
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
      pointsRedeemed: 0,
      pointsDiscountAmount: 0,
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

    await this.syncCineFlashPromo(saved);
    await this.cartRepo.save(saved);
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
   * `PUT /cart`: quitar sillas (confitería → `POST|PUT|DELETE /cart/snacks`).
   *
   * @param userId - Usuario del JWT.
   * @param dto - Cambios a aplicar.
   * @returns {Promise<CartResponse>} Carrito actualizado.
   */
  async update(userId: string, dto: UpdateCartDto): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    if (!dto.removeSeatIds?.length) {
      throw new BadRequestException(
        'Indica removeSeatIds. Para confitería usa POST/PUT/DELETE /cart/snacks (HU-012).',
      );
    }

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

    return this.touchAndRespond(cart);
  }

  /**
   * `POST /cart/snacks`: agrega (o suma) un producto del catálogo (HU-012).
   *
   * Valida stock sin descontarlo (RN-049 / RN-052).
   * Aplica precio de catálogo (+ promo producto); membresía en totales (RN-051).
   *
   * @param userId - Usuario del JWT.
   * @param dto - snackId + quantity.
   * @returns {Promise<CartResponse>} Carrito actualizado.
   */
  async addSnack(
    userId: string,
    dto: AddCartSnackDto,
  ): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    const cinemaId = await this.resolvePickupCinemaId(cart);
    const existing = (cart.snacks ?? []).find((s) => s.snackId === dto.snackId);
    const newQty = (existing?.quantity ?? 0) + dto.quantity;

    const { snack, unitPrice } = await this.snacksService.assertPurchasable(
      dto.snackId,
      newQty,
      cinemaId,
    );

    if (existing) {
      existing.quantity = newQty;
      existing.unitPrice = unitPrice;
      existing.name = snack.name;
      existing.imageUrl = snack.imageUrl;
    } else {
      const line = this.snackItemRepo.create({
        cartId: cart.id,
        snackId: snack.id,
        name: snack.name,
        imageUrl: snack.imageUrl,
        quantity: dto.quantity,
        unitPrice,
      });
      cart.snacks = [...(cart.snacks ?? []), line];
    }

    return this.touchAndRespond(cart);
  }

  /**
   * `PUT /cart/snacks`: fija la cantidad de un snack ya en el carrito.
   *
   * @param userId - Usuario del JWT.
   * @param dto - snackId + quantity total.
   * @returns {Promise<CartResponse>} Carrito actualizado.
   */
  async updateSnack(
    userId: string,
    dto: UpdateCartSnackDto,
  ): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    const existing = (cart.snacks ?? []).find((s) => s.snackId === dto.snackId);
    if (!existing) {
      throw new NotFoundException(
        `El snack no está en el carrito: ${dto.snackId}. Usa POST /cart/snacks para agregarlo.`,
      );
    }

    const cinemaId = await this.resolvePickupCinemaId(cart);
    const { snack, unitPrice } = await this.snacksService.assertPurchasable(
      dto.snackId,
      dto.quantity,
      cinemaId,
    );

    existing.quantity = dto.quantity;
    existing.unitPrice = unitPrice;
    existing.name = snack.name;
    existing.imageUrl = snack.imageUrl;

    return this.touchAndRespond(cart);
  }

  /**
   * `DELETE /cart/snacks`: quita o reduce confitería del carrito.
   *
   * @param userId - Usuario del JWT.
   * @param dto - snackId + quantity opcional a restar.
   * @returns {Promise<CartResponse>} Carrito actualizado.
   */
  async removeSnack(
    userId: string,
    dto: RemoveCartSnackDto,
  ): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    const existing = (cart.snacks ?? []).find((s) => s.snackId === dto.snackId);
    if (!existing) {
      throw new NotFoundException(
        `El snack no está en el carrito: ${dto.snackId}`,
      );
    }

    if (dto.quantity === undefined || dto.quantity >= existing.quantity) {
      await this.snackItemRepo.remove(existing);
      cart.snacks = (cart.snacks ?? []).filter(
        (s) => s.snackId !== dto.snackId,
      );
    } else {
      existing.quantity -= dto.quantity;
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
   * `POST /cart/apply-promo`: aplica cupón del catálogo (HU-026).
   *
   * RN-048 / RN-105 apilabilidad · RN-106 vigencia · RN-107 tope por usuario.
   *
   * @param userId - Usuario del JWT.
   * @param dto - Código de promoción.
   * @returns {Promise<CartResponse>} Carrito con promo.
   */
  async applyPromo(userId: string, dto: ApplyPromoDto): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    const ticketsSubtotal = money(
      (cart.tickets ?? []).reduce((acc, t) => acc + Number(t.unitPrice), 0),
    );
    const snacksSubtotal = money(
      (cart.snacks ?? []).reduce(
        (acc, s) => acc + Number(s.unitPrice) * s.quantity,
        0,
      ),
    );
    const ticketUnitPrices = (cart.tickets ?? []).map((t) => Number(t.unitPrice));

    const ctx = await this.promotionsService.buildCartContext(
      userId,
      cart.showtimeId,
      ticketsSubtotal,
      snacksSubtotal,
      ticketUnitPrices,
    );

    const applied = await this.promotionsService.applyCodeToCart(
      dto.code,
      ctx,
      {
        code: cart.promoCode,
        discountAmount: Number(cart.promoDiscountAmount),
        stackable: cart.promoStackable,
      },
    );

    /** RN-100: promo incompatible no combina con puntos ya aplicados. */
    if (
      applied.incompatibleWithPoints &&
      (cart.pointsRedeemed > 0 || Number(cart.pointsDiscountAmount) > 0)
    ) {
      throw new ConflictException({
        message:
          'Esta promoción es incompatible con puntos ya aplicados (RN-100)',
        code: 'POINTS_PROMO_INCOMPATIBLE',
      });
    }

    const code = applied.code ?? dto.code.trim().toUpperCase();
    if (cart.promoCode && cart.promoCode !== code) {
      cart.promoDiscountAmount =
        Number(cart.promoDiscountAmount) + applied.discountAmount;
      cart.promoCode = `${cart.promoCode}+${code}`;
      cart.promoStackable = Boolean(cart.promoStackable && applied.stackable);
    } else {
      cart.promoCode = code;
      cart.promoDiscountAmount = applied.discountAmount;
      cart.promoStackable = applied.stackable;
    }

    return this.touchAndRespond(cart);
  }

  /**
   * `POST /cart/apply-points`: aplica puntos como descuento (HU-023).
   *
   * RN-100 bloquea si hay promo incompatible. El débito real es al PAID.
   *
   * @param userId - Usuario del JWT.
   * @param dto - Cantidad de puntos.
   * @returns {Promise<CartResponse>} Totales con puntos.
   */
  async applyPoints(
    userId: string,
    dto: ApplyPointsDto,
  ): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    cart.pointsRedeemed = 0;
    cart.pointsDiscountAmount = 0;
    const preview = await this.toResponse(cart, userId);
    const maxApplicable = money(
      preview.summary.subtotal -
        preview.summary.membershipDiscount -
        preview.summary.promoDiscount +
        preview.summary.tax -
        preview.summary.giftcardAmount,
    );

    const { points, amountCop } = await this.loyaltyService.previewForCart(
      userId,
      dto.points,
      maxApplicable,
      cart.promoCode,
    );

    cart.pointsRedeemed = points;
    cart.pointsDiscountAmount = amountCop;
    return this.touchAndRespond(cart);
  }

  /**
   * `POST /cart/apply-giftcard`: aplica bono digital al total (HU-018).
   *
   * RN-077 uso parcial · RN-079 entradas + confitería.
   * El débito real ocurre al confirmar el pago (webhook APPROVED).
   *
   * @param userId - Usuario del JWT.
   * @param dto - Código del bono.
   * @returns {Promise<CartResponse>} Totales con giftcard.
   */
  async applyGiftcard(
    userId: string,
    dto: ApplyGiftcardDto,
  ): Promise<CartResponse> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    /** Calcula base pagable sin giftcard para topar el descuento. */
    cart.giftcardCode = null;
    cart.giftcardAmount = 0;
    const preview = await this.toResponse(cart, userId);
    const maxApplicable = money(
      preview.summary.subtotal -
        preview.summary.membershipDiscount -
        preview.summary.promoDiscount +
        preview.summary.tax -
        preview.summary.pointsDiscountAmount,
    );

    const { giftcard, amount } = await this.giftcardsService.previewForCart(
      dto.code,
      maxApplicable,
    );

    cart.giftcardCode = giftcard.code;
    cart.giftcardAmount = amount;
    return this.touchAndRespond(cart);
  }

  /**
   * Prepara el carrito ACTIVE para iniciar pago (HU-013).
   *
   * Valida locks vigentes, revalida stock de snacks y renueva TTL.
   *
   * @param userId - Usuario del JWT.
   * @returns Carrito entidad + vista con totales.
   */
  async prepareForPayment(
    userId: string,
  ): Promise<{ cart: Cart; view: CartResponse }> {
    await this.expireOverdueCarts(userId);
    const cart = await this.requireActiveCart(userId);
    await this.assertLocksStillHeld(cart);

    if (!cart.tickets?.length) {
      throw new BadRequestException(
        'El carrito no tiene entradas; no se puede pagar',
      );
    }

    const cinemaId = await this.resolvePickupCinemaId(cart);
    for (const line of cart.snacks ?? []) {
      await this.snacksService.assertPurchasable(
        line.snackId,
        line.quantity,
        cinemaId,
      );
    }

    const view = await this.touchAndRespond(cart);
    const refreshed = await this.requireActiveCart(userId);
    return { cart: refreshed, view };
  }

  /**
   * Marca el carrito en CHECKOUT mientras se espera el webhook (HU-013).
   *
   * @param cartId - UUID del carrito.
   * @param userId - Dueño (seguridad).
   * @param expiresAt - Nueva caducidad alineada al intento de pago.
   */
  async markCheckout(
    cartId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<void> {
    const cart = await this.cartRepo.findOne({
      where: { id: cartId, userId, status: CartStatus.ACTIVE },
    });
    if (!cart) {
      throw new ConflictException(
        'El carrito ya no está ACTIVE; no se puede iniciar el pago',
      );
    }
    cart.status = CartStatus.CHECKOUT;
    cart.expiresAt = expiresAt;
    cart.lastActivityAt = new Date();
    await this.cartRepo.save(cart);
    await this.seatsService.extendReservationExpiry(
      userId,
      cart.reservationId,
      expiresAt,
    );
  }

  /**
   * Marca carrito COMPLETED tras pago aprobado (HU-013).
   *
   * @param cartId - UUID.
   * @param userId - Dueño.
   */
  async markCompleted(cartId: string, userId: string): Promise<void> {
    await this.cartRepo.update(
      { id: cartId, userId },
      { status: CartStatus.COMPLETED, lastActivityAt: new Date() },
    );
  }

  /**
   * Abandona checkout (pago rechazado / fallo): cancela y libera sillas (RN-054).
   *
   * @param cartId - UUID.
   * @param userId - Dueño.
   * @returns Cantidad de sillas liberadas.
   */
  async failCheckout(cartId: string, userId: string): Promise<number> {
    const cart = await this.cartRepo.findOne({
      where: { id: cartId, userId },
      relations: { tickets: true, snacks: true },
    });
    if (!cart) {
      return 0;
    }
    if (
      cart.status === CartStatus.COMPLETED ||
      cart.status === CartStatus.CANCELLED ||
      cart.status === CartStatus.EXPIRED
    ) {
      return 0;
    }
    return this.cancelCartEntity(cart, true, CartStatus.CANCELLED);
  }

  /**
   * Expira carritos ACTIVE/CHECKOUT vencidos y libera sillas (RN-046 / RN-054).
   *
   * @param userId - Opcional: limita al usuario (lazy por request).
   * @returns {Promise<number>} Carritos expirados.
   */
  async expireOverdueCarts(userId?: string): Promise<number> {
    const qb = this.cartRepo
      .createQueryBuilder('cart')
      .leftJoinAndSelect('cart.tickets', 'tickets')
      .leftJoinAndSelect('cart.snacks', 'snacks')
      .where('cart.status IN (:...statuses)', {
        statuses: [CartStatus.ACTIVE, CartStatus.CHECKOUT],
      })
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
    await this.syncCineFlashPromo(cart);
    const saved = await this.cartRepo.save(cart);
    await this.seatsService.extendReservationExpiry(
      saved.userId,
      saved.reservationId,
      saved.expiresAt,
    );
    return this.toResponse(saved, saved.userId);
  }

  /**
   * Auto-aplica Cine Flash (HU-019) si la función tiene promo activa.
   *
   * RN-082 solo entradas · RN-083 no acumulable: no pisa un cupón
   * manual distinto; limpia el descuento flash si ya no está vigente.
   *
   * @param cart - Carrito ACTIVE (mutado in-place).
   */
  private async syncCineFlashPromo(cart: Cart): Promise<void> {
    const flash =
      await this.promotionsService.findActiveCineFlashForShowtime(
        cart.showtimeId,
      );
    const isFlashCode = (code: string | null) =>
      Boolean(code && code.startsWith('FLASH-'));

    if (!flash) {
      if (isFlashCode(cart.promoCode)) {
        cart.promoCode = null;
        cart.promoDiscountAmount = 0;
        cart.promoStackable = null;
      }
      return;
    }

    if (cart.promoCode && !isFlashCode(cart.promoCode)) {
      return;
    }

    const ticketsSubtotal = money(
      (cart.tickets ?? []).reduce((acc, t) => acc + Number(t.unitPrice), 0),
    );
    if (ticketsSubtotal <= 0) {
      return;
    }

    const discount = this.promotionsService.calculateDiscount(flash, {
      userId: cart.userId,
      ticketsSubtotal,
      snacksSubtotal: 0,
      ticketUnitPrices: (cart.tickets ?? []).map((t) => Number(t.unitPrice)),
      showtimeId: cart.showtimeId,
    });

    cart.promoCode = flash.code;
    cart.promoDiscountAmount = discount;
    cart.promoStackable = false;
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

  /**
   * Cine de pickup = complejo de la función del carrito.
   */
  private async resolvePickupCinemaId(cart: Cart): Promise<string | null> {
    const showtime = await this.showtimeRepo.findOne({
      where: { id: cart.showtimeId },
      relations: { room: { cinema: true } },
    });
    return showtime?.room?.cinema?.id ?? null;
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

    const showtime = await this.showtimeRepo.findOne({
      where: { id: cart.showtimeId },
      relations: { room: { cinema: true } },
    });
    const pickup = {
      cinemaId: showtime?.room?.cinema?.id ?? null,
      cinemaName: showtime?.room?.cinema?.name ?? null,
    };

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
    const pointsDiscountAmount = money(Number(cart.pointsDiscountAmount));
    const afterDiscounts = Math.max(
      0,
      money(subtotal - membershipDiscount - promoDiscount),
    );
    const tax = money(afterDiscounts * CART_TAX_RATE);
    const total = Math.max(
      0,
      money(afterDiscounts + tax - giftcardAmount - pointsDiscountAmount),
    );

    const summary: CartSummary = {
      currency: 'COP',
      ticketsSubtotal,
      snacksSubtotal,
      subtotal,
      membershipDiscount,
      promoDiscount,
      giftcardAmount,
      pointsDiscountAmount,
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
      pickup,
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
      points: {
        redeemed: cart.pointsRedeemed ?? 0,
        discountAmount: pointsDiscountAmount,
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
