import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { MembershipResult, MembershipService } from './membership.service';

/**
 * Membresía digital (HU-006).
 *
 * El registro (`POST /auth/register`) ya crea la membresía.
 * `POST /membership/create` cubre el endpoint del backlog para altas
 * explícitas cuando el usuario aún no tiene una.
 */
@ApiTags('Membership')
@Controller('membership')
export class MembershipController {
  /**
   * @param membershipService - Creación de membresía + billetera.
   */
  constructor(private readonly membershipService: MembershipService) {}

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
