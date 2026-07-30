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
import { CreateMembershipDto } from './dto/create-membership.dto';
import {
  MembershipDetailResult,
  MembershipResult,
  MembershipService,
} from './membership.service';

/**
 * Membresía digital (HU-006 creación + HU-008 consulta).
 *
 * El registro (`POST /auth/register`) ya crea la membresía.
 * `POST /membership/create` cubre altas explícitas.
 * `GET /membership` muestra beneficios, QR y historiales (vacíos por ahora).
 */
@ApiTags('Membership')
@Controller('membership')
export class MembershipController {
  /**
   * @param membershipService - Creación y consulta de membresía + billetera.
   */
  constructor(private readonly membershipService: MembershipService) {}

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
      'RN-032 descuentos por nivel; RN-033 QR único e intransferible (`qr.payload`).',
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
