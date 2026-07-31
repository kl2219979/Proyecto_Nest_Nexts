import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import type { MembershipLevelsResponse } from '../loyalty/dto/loyalty-response';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import {
  MembershipDetailResult,
  MembershipResult,
  MembershipService,
} from './membership.service';

/**
 * Membresía digital (HU-006 creación + HU-008 consulta + HU-023 niveles).
 *
 * El registro (`POST /auth/register`) ya crea la membresía.
 * `POST /membership/create` cubre altas explícitas.
 * `GET /membership` muestra beneficios, QR e historiales.
 * `GET /membership/levels` catálogo Bronce→Platino (HU-023).
 */
@ApiTags('Membership')
@Controller('membership')
export class MembershipController {
  /**
   * @param membershipService - Creación y consulta de membresía + billetera.
   * @param loyaltyService - Catálogo de niveles (HU-023).
   */
  constructor(
    private readonly membershipService: MembershipService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  /**
   * Catálogo de niveles Bronce → Platino y umbrales (HU-023 / RN-101).
   *
   * @returns Umbrales, multiplicadores y beneficios por nivel.
   */
  @Get('levels')
  @ApiOperation({
    summary: 'Catálogo de niveles de membresía / fidelización',
    description:
      'HU-023 · umbrales de puntos de por vida · multiplicadores de acumulación · beneficios RN-032.',
  })
  @ApiOkResponse({ description: 'Niveles disponibles' })
  listLevels(): MembershipLevelsResponse {
    return this.loyaltyService.listLevels();
  }

  /**
   * Consulta membresía, beneficios y QR del usuario autenticado (HU-008).
   *
   * @param user - Usuario del Access JWT.
   * @returns {Promise<MembershipDetailResult>} Detalle del socio.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar membresía y beneficios del usuario autenticado',
    description:
      'RN-032 descuentos por nivel; RN-033 QR único e intransferible (`qr.payload`); puntos HU-023.',
  })
  @ApiOkResponse({ description: 'Membresía encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiNotFoundResponse({ description: 'El usuario no tiene membresía' })
  getMine(@CurrentUser() user: AuthUser): Promise<MembershipDetailResult> {
    return this.membershipService.getDetailForUser(user.userId);
  }

  /**
   * Crea membresía y billetera vacía para un usuario existente.
   *
   * @param dto - `userId`.
   * @returns {Promise<MembershipResult>} Membresía con código único.
   */
  @Post('create')
  @ApiOperation({
    summary: 'Crear membresía digital para un usuario',
    description:
      'RN-025 / RN-026. Normalmente lo invoca el registro; aquí queda expuesto.',
  })
  @ApiCreatedResponse({ description: 'Membresía creada' })
  @ApiConflictResponse({ description: 'El usuario ya tiene membresía' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  create(@Body() dto: CreateMembershipDto): Promise<MembershipResult> {
    return this.membershipService.create(dto);
  }
}
