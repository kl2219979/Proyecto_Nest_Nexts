import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { CartService } from './cart.service';
import { CartResponse, DeleteCartResult } from './dto/cart-response';
import {
  AddCartSnackDto,
  RemoveCartSnackDto,
  UpdateCartSnackDto,
} from './dto/cart-snacks.dto';
import { ApplyPromoDto, CreateCartDto, UpdateCartDto, ApplyGiftcardDto } from './dto/cart.dto';

/**
 * Carrito de compras (HU-011 + confitería HU-012).
 *
 * Prefijo global `/api/v1`:
 * - `POST   /cart`
 * - `GET    /cart`
 * - `PUT    /cart`
 * - `DELETE /cart`
 * - `POST   /cart/apply-membership`
 * - `POST   /cart/apply-promo`
 * - `POST   /cart/apply-giftcard`
 * - `POST   /cart/snacks`
 * - `PUT    /cart/snacks`
 * - `DELETE /cart/snacks`
 */
@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  /**
   * @param cartService - CRUD y totales del carrito.
   */
  constructor(private readonly cartService: CartService) {}

  /**
   * Crea el carrito a partir de las sillas bloqueadas (HU-010).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - `reservationId` opcional.
   * @returns {Promise<CartResponse>} Carrito con descuentos RN-047.
   */
  @Post()
  @ApiOperation({
    summary: 'Crear carrito desde la reserva de sillas',
    description:
      'RN-044 un carrito activo · RN-045 mantiene locks · RN-047 aplica membresía.',
  })
  @ApiCreatedResponse({ description: 'Carrito creado o renovado' })
  @ApiBadRequestResponse({ description: 'Sin sillas bloqueadas' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCartDto = {},
  ): Promise<CartResponse> {
    return this.cartService.create(user.userId, dto);
  }

  /**
   * Consulta el carrito ACTIVE (renueva TTL de inactividad).
   *
   * @param user - Usuario del Access JWT.
   * @returns {Promise<CartResponse>} Resumen + ítems.
   */
  @Get()
  @ApiOperation({
    summary: 'Consultar carrito activo',
    description: 'Renueva expiresAt (~10 min, RN-046) y locks de sillas.',
  })
  @ApiOkResponse({ description: 'Carrito vigente' })
  @ApiNotFoundResponse({ description: 'Sin carrito activo' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  getMine(@CurrentUser() user: AuthUser): Promise<CartResponse> {
    return this.cartService.getActive(user.userId);
  }

  /**
   * Quita sillas del carrito.
   *
   * @param user - Usuario del Access JWT.
   * @param dto - `removeSeatIds`.
   * @returns {Promise<CartResponse>} Carrito actualizado.
   */
  @Put()
  @ApiOperation({
    summary: 'Actualizar carrito (sillas)',
    description:
      'removeSeatIds libera locks. Confitería: POST/PUT/DELETE /cart/snacks.',
  })
  @ApiOkResponse({ description: 'Carrito actualizado' })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @ApiNotFoundResponse({ description: 'Sin carrito activo' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCartDto,
  ): Promise<CartResponse> {
    return this.cartService.update(user.userId, dto);
  }

  /**
   * Agrega confitería del catálogo al carrito (HU-012).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - snackId + quantity.
   * @returns {Promise<CartResponse>} Totales actualizados.
   */
  @Post('snacks')
  @ApiOperation({
    summary: 'Agregar confitería al carrito',
    description:
      'RN-049 valida stock sin descontarlo (RN-052). RN-051 membresía en snacks.',
  })
  @ApiCreatedResponse({ description: 'Snack agregado' })
  @ApiBadRequestResponse({ description: 'Agotado o cantidad inválida' })
  @ApiNotFoundResponse({ description: 'Producto o carrito inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  addSnack(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddCartSnackDto,
  ): Promise<CartResponse> {
    return this.cartService.addSnack(user.userId, dto);
  }

  /**
   * Actualiza la cantidad de un snack en el carrito (HU-012).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - snackId + quantity.
   * @returns {Promise<CartResponse>} Totales actualizados.
   */
  @Put('snacks')
  @ApiOperation({
    summary: 'Actualizar cantidad de confitería',
    description: 'Fija quantity total; RN-049 valida stock disponible.',
  })
  @ApiOkResponse({ description: 'Cantidad actualizada' })
  @ApiBadRequestResponse({ description: 'Stock insuficiente' })
  @ApiNotFoundResponse({ description: 'Línea o carrito inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  updateSnack(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCartSnackDto,
  ): Promise<CartResponse> {
    return this.cartService.updateSnack(user.userId, dto);
  }

  /**
   * Quita o reduce confitería del carrito (HU-012).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - snackId + quantity opcional.
   * @returns {Promise<CartResponse>} Totales actualizados.
   */
  @Delete('snacks')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Quitar confitería del carrito',
    description: 'Sin quantity elimina la línea; con quantity resta unidades.',
  })
  @ApiOkResponse({ description: 'Snack removido o reducido' })
  @ApiNotFoundResponse({ description: 'Línea o carrito inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  removeSnack(
    @CurrentUser() user: AuthUser,
    @Body() dto: RemoveCartSnackDto,
  ): Promise<CartResponse> {
    return this.cartService.removeSnack(user.userId, dto);
  }

  /**
   * Elimina el carrito y libera las sillas.
   *
   * @param user - Usuario del Access JWT.
   * @returns {Promise<DeleteCartResult>} Estado cancelado.
   */
  @Delete()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancelar carrito',
    description: 'Libera locks de la reservationId asociada (RN-045).',
  })
  @ApiOkResponse({ description: 'Carrito cancelado' })
  @ApiNotFoundResponse({ description: 'Sin carrito activo' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  remove(@CurrentUser() user: AuthUser): Promise<DeleteCartResult> {
    return this.cartService.delete(user.userId);
  }

  /**
   * Aplica / reafirma el descuento de membresía (RN-047 / RN-051).
   *
   * @param user - Usuario del Access JWT.
   * @returns {Promise<CartResponse>} Totales recalculados.
   */
  @Post('apply-membership')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aplicar descuento de membresía',
    description: 'RN-047/051: % según nivel (benefitsForLevel) en entradas y snacks.',
  })
  @ApiOkResponse({ description: 'Descuento aplicado' })
  @ApiNotFoundResponse({ description: 'Sin carrito activo' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  applyMembership(@CurrentUser() user: AuthUser): Promise<CartResponse> {
    return this.cartService.applyMembership(user.userId);
  }

  /**
   * Aplica un cupón del catálogo (HU-026).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - Código de promoción.
   * @returns {Promise<CartResponse>} Totales con promo.
   */
  @Post('apply-promo')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aplicar promoción / cupón',
    description:
      'Catálogo admin (HU-026). RN-048/105 apilabilidad · RN-106 vigencia · RN-107 tope por usuario.',
  })
  @ApiOkResponse({ description: 'Promoción aplicada' })
  @ApiConflictResponse({ description: 'Promos no combinables (RN-048/105)' })
  @ApiNotFoundResponse({ description: 'Cupón o carrito inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  applyPromo(
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyPromoDto,
  ): Promise<CartResponse> {
    return this.cartService.applyPromo(user.userId, dto);
  }

  /**
   * Aplica un bono de regalo digital (HU-018 / RN-079).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - Código del bono.
   * @returns {Promise<CartResponse>} Totales con giftcard.
   */
  @Post('apply-giftcard')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aplicar bono de regalo al carrito',
    description:
      'HU-018 · RN-077 uso parcial · RN-079 entradas + confitería. ' +
      'El saldo se debita al confirmar el pago.',
  })
  @ApiOkResponse({ description: 'Bono aplicado' })
  @ApiConflictResponse({ description: 'Expirado, redimido o sin parcial' })
  @ApiNotFoundResponse({ description: 'Código o carrito inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  applyGiftcard(
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyGiftcardDto,
  ): Promise<CartResponse> {
    return this.cartService.applyGiftcard(user.userId, dto);
  }
}
