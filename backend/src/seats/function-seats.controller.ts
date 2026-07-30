import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/jwt/optional-jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { LockSeatsDto } from './dto/lock-seats.dto';
import {
  ReservationResponse,
  SeatMapResponse,
} from './dto/seat-map-response';
import { SeatsService } from './seats.service';

/**
 * Plano y bloqueo de sillas por función (HU-010).
 *
 * Prefijo global `/api/v1`:
 * - `GET  /functions/:id/seats` (público; JWT opcional → SELECTED)
 * - `POST /functions/:id/seats` (JWT) bloqueo temporal RN-039
 */
@ApiTags('Functions')
@Controller('functions')
export class FunctionSeatsController {
  /**
   * @param seatsService - Mapa y locks.
   */
  constructor(private readonly seatsService: SeatsService) {}

  /**
   * Plano de la sala con estados en tiempo real.
   *
   * @param id - UUID de la función.
   * @param user - Usuario si envió JWT válido.
   * @returns {Promise<SeatMapResponse>} Mapa + mySelection opcional.
   */
  @Get(':id/seats')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mapa de sillas de una función',
    description:
      'Estados AVAILABLE / SELECTED / LOCKED / SOLD / DISABLED · RN-041/043. JWT opcional para marcar SELECTED y mySelection.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Plano con estados' })
  @ApiNotFoundResponse({
    description: 'Función inexistente, inactiva, iniciada o sin plano',
  })
  getSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<SeatMapResponse> {
    return this.seatsService.getSeatMap(id, user?.userId);
  }

  /**
   * Bloquea sillas ~10 minutos (RN-039).
   *
   * @param id - UUID de la función.
   * @param user - Usuario del Access JWT.
   * @param dto - seatIds + ack preferenciales.
   * @returns {Promise<ReservationResponse>} Reserva con resumen.
   */
  @Post(':id/seats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bloquear sillas temporalmente',
    description:
      'RN-039 lock 10 min · RN-041/043 anti doble-venta · RN-042 preferenciales con acknowledgePreferential.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Sillas bloqueadas' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiBadRequestResponse({
    description: 'Validación, máximo excedido o preferencial sin ack',
  })
  @ApiConflictResponse({ description: 'Silla ya ocupada (RN-041/043)' })
  @ApiNotFoundResponse({ description: 'Función no seleccionable' })
  lockSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: LockSeatsDto,
  ): Promise<ReservationResponse> {
    return this.seatsService.lockSeats(id, user.userId, dto);
  }
}
