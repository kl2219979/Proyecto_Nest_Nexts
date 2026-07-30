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
import { ApplyPromoDto, CreateCartDto, UpdateCartDto } from './dto/cart.dto';

/**
 * Carrito de compras (HU-011).
 *
 * Prefijo global `/api/v1`:
 * - `POST   /cart`
 * - `GET    /cart`
 * - `PUT    /cart`
 * - `DELETE /cart`
 * - `POST   /cart/apply-membership`
 * - `POST   /cart/apply-promo`
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
   * Modifica entradas (quitar sillas) y/o confitería.
   *
   * @param user - Usuario del Access JWT.
   * @param dto - Cambios.
   * @returns {Promise<CartResponse>} Carrito actualizado.
   */
  @Put()
  @ApiOperation({
    summary: 'Actualizar carrito',
    description:
      'removeSeatIds libera locks. snacks reemplaza confitería (stock = HU-012).',
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
   * Aplica / reafirma el descuento de membresía (RN-047).
   *
   * @param user - Usuario del Access JWT.
   * @returns {Promise<CartResponse>} Totales recalculados.
   */
  @Post('apply-membership')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aplicar descuento de membresía',
    description: 'RN-047: % según nivel (benefitsForLevel).',
  })
  @ApiOkResponse({ description: 'Descuento aplicado' })
  @ApiNotFoundResponse({ description: 'Sin carrito activo' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  applyMembership(@CurrentUser() user: AuthUser): Promise<CartResponse> {
    return this.cartService.applyMembership(user.userId);
  }

  /**
   * Aplica un cupón demo (RN-048; catálogo real = HU-026).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - Código (`MULTICINE10`, `SNACK5K`).
   * @returns {Promise<CartResponse>} Totales con promo.
   */
  @Post('apply-promo')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aplicar promoción / cupón',
    description:
      'Demo: MULTICINE10 (no apilable), SNACK5K (apilable). RN-048.',
  })
  @ApiOkResponse({ description: 'Promoción aplicada' })
  @ApiConflictResponse({ description: 'Promos no combinables (RN-048)' })
  @ApiNotFoundResponse({ description: 'Cupón o carrito inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  applyPromo(
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyPromoDto,
  ): Promise<CartResponse> {
    return this.cartService.applyPromo(user.userId, dto);
  }
}
