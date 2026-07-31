import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
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
  PointsBalanceResponse,
  RedeemPointsResponse,
} from './dto/loyalty-response';
import { RedeemPointsDto } from './dto/loyalty.dto';
import { PointsRedeemDestination } from './enums/loyalty.enums';
import { COP_PER_REDEEMED_POINT } from './loyalty.constants';
import { LoyaltyService } from './loyalty.service';

/**
 * Endpoints de puntos de fidelización (HU-023).
 *
 * Prefijo global `/api/v1`:
 * - `GET  /points` — saldo, nivel e historial
 * - `POST /points` — redimir a billetera (bonos)
 *
 * Niveles: `GET /membership/levels` (MembershipController).
 * Carrito: `POST /cart/apply-points`.
 */
@ApiTags('Loyalty')
@Controller('points')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  /**
   * @param loyaltyService - Acumulación / redención / historial.
   */
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /**
   * Consulta saldo disponible, progreso de nivel e historial (HU-023).
   *
   * @param user - JWT.
   */
  @Get()
  @ApiOperation({
    summary: 'Consultar puntos de fidelización',
    description:
      'RN-099 aplica vencimientos pendientes. Incluye multiplicador de nivel y historial.',
  })
  @ApiOkResponse({ description: 'Saldo e historial' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiNotFoundResponse({ description: 'Sin membresía' })
  getBalance(@CurrentUser() user: AuthUser): Promise<PointsBalanceResponse> {
    return this.loyaltyService.getBalance(user.userId);
  }

  /**
   * Redime puntos a crédito COP en la billetera (bonos) (HU-023).
   *
   * Para entradas/confitería usar `POST /cart/apply-points`.
   *
   * @param user - JWT.
   * @param dto - Puntos y destino WALLET.
   */
  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Redimir puntos a billetera',
    description:
      `1 punto = ${COP_PER_REDEEMED_POINT} COP. destination=WALLET acredita el saldo (bonos). ` +
      'Entradas/snacks: POST /cart/apply-points.',
  })
  @ApiOkResponse({ description: 'Puntos redimidos' })
  @ApiBadRequestResponse({ description: 'points inválido' })
  @ApiConflictResponse({ description: 'Saldo insuficiente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  redeem(
    @CurrentUser() user: AuthUser,
    @Body() dto: RedeemPointsDto,
  ): Promise<RedeemPointsResponse> {
    if (dto.destination !== PointsRedeemDestination.WALLET) {
      throw new BadRequestException('Solo se admite destination=WALLET');
    }
    return this.loyaltyService.redeemToWallet(user.userId, dto.points);
  }
}
