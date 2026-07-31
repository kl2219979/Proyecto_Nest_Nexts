import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import {
  AvailableFunctionsForOrderResponse,
  PaidOrderSummary,
  PaidOrdersListResponse,
  RescheduleResult,
} from './dto/reschedule-response';
import {
  AvailableFunctionsQueryDto,
  RescheduleOrderDto,
} from './dto/reschedule.dto';
import { RescheduleService } from './reschedule.service';

/**
 * Órdenes pagadas y cambio de función (HU-016) + detalle (HU-029).
 *
 * Prefijo global `/api/v1`:
 * - `GET  /orders` — Mis compras (reservas PAID)
 * - `GET  /orders/:id` — Detalle de una compra
 * - `GET  /orders/:id/available-functions` — funciones alternativas
 * - `PUT  /orders/:id/reschedule` — confirmar reprogramación
 *
 * `GET /reservations` (HU-010) sigue listando solo locks temporales.
 */
@ApiTags('Orders / Reschedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  /**
   * @param rescheduleService - Listado, alternativas y confirmación.
   */
  constructor(private readonly rescheduleService: RescheduleService) {}

  /**
   * Lista compras confirmadas del usuario.
   *
   * @param user - JWT.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar mis compras (órdenes PAID)',
    description:
      'Mis compras / reservas confirmadas. Incluye `canReschedule` (RN-065: ≥1 h antes).',
  })
  @ApiOkResponse({ description: 'Lista de órdenes pagadas' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listMine(
    @CurrentUser() user: AuthUser,
  ): Promise<PaidOrdersListResponse> {
    return this.rescheduleService.listPaidOrders(user.userId);
  }

  /**
   * Funciones alternativas de la misma película.
   *
   * Declarado antes de `:id` genérico.
   *
   * @param user - JWT.
   * @param id - UUID de la orden.
   * @param query - `cityId` obligatorio.
   */
  @Get(':id/available-functions')
  @ApiOperation({
    summary: 'Funciones disponibles para reprogramar',
    description:
      'Misma película, solo futuras y con sillas (RN-066/067). Excluye la función actual.',
  })
  @ApiOkResponse({ description: 'Listado de funciones alternativas' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  availableFunctions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AvailableFunctionsQueryDto,
  ): Promise<AvailableFunctionsForOrderResponse> {
    return this.rescheduleService.listAvailableFunctions(
      user.userId,
      id,
      query.cityId,
    );
  }

  /**
   * Detalle de una compra PAID del usuario (HU-029).
   *
   * @param user - JWT.
   * @param id - UUID de la orden.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de una compra (orden PAID)',
    description: 'HU-029 · solo el dueño · incluye canReschedule (RN-065).',
  })
  @ApiOkResponse({ description: 'Orden encontrada' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  getMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaidOrderSummary> {
    return this.rescheduleService.getPaidOrderById(user.userId, id);
  }

  /**
   * Confirma el cambio de función (sillas nuevas ya bloqueadas).
   *
   * @param user - JWT.
   * @param id - UUID de la orden (se conserva — RN-069).
   * @param dto - Nueva función + reservationId de sillas.
   */
  @Put(':id/reschedule')
  @ApiOperation({
    summary: 'Confirmar cambio de función',
    description:
      'Invalida QR anteriores (RN-068), confirma sillas nuevas, regenera entradas, ' +
      'ajusta economía (billetera) y audita (RN-070). Conserva el orderId (RN-069).',
  })
  @ApiOkResponse({ description: 'Reprogramación aplicada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o cantidad de sillas' })
  @ApiConflictResponse({ description: 'Fuera de ventana RN-065 o sin VALID' })
  @ApiNotFoundResponse({ description: 'Orden o reserva temporal no encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleOrderDto,
  ): Promise<RescheduleResult> {
    return this.rescheduleService.reschedule(user.userId, id, dto);
  }
}
