import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { ReleaseSeatsDto } from './dto/lock-seats.dto';
import {
  ReleaseSeatsResult,
  ReservationResponse,
} from './dto/seat-map-response';
import { SeatsService } from './seats.service';

/**
 * Reservas temporales de sillas (HU-010).
 *
 * Prefijo global `/api/v1`:
 * - `GET    /reservations`
 * - `DELETE /reservations/release-seats`
 */
@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  /**
   * @param seatsService - Locks y resumen.
   */
  constructor(private readonly seatsService: SeatsService) {}

  /**
   * Reservas temporales activas del usuario (resumen de selección).
   *
   * @param user - Usuario del Access JWT.
   * @returns {Promise<ReservationResponse[]>} Grupos activos.
   */
  @Get()
  @ApiOperation({
    summary: 'Reservas de sillas activas del usuario',
    description:
      'Incluye resumen (cantidad, unitario, subtotal) antes de continuar al carrito (HU-011).',
  })
  @ApiOkResponse({ description: 'Lista de reservas temporales' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listMine(
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationResponse[]> {
    return this.seatsService.listMyReservations(user.userId);
  }

  /**
   * Libera sillas bloqueadas (abandono / cancelación — RN-040).
   *
   * @param user - Usuario del Access JWT.
   * @param dto - `reservationId` opcional.
   * @returns {Promise<ReleaseSeatsResult>} Cantidad liberada.
   */
  @Delete('release-seats')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Liberar sillas bloqueadas',
    description:
      'Sin body o sin reservationId libera todos los locks temporales del usuario.',
  })
  @ApiOkResponse({ description: 'Sillas liberadas' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  release(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReleaseSeatsDto = {},
  ): Promise<ReleaseSeatsResult> {
    return this.seatsService.releaseSeats(user.userId, dto.reservationId);
  }
}
