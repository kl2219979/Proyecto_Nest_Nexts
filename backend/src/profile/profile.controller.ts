import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  ProfileResult,
  ProfileService,
  UpdateProfileResult,
} from './profile.service';

/**
 * Perfil del usuario autenticado (HU-008).
 *
 * Prefijo global `/api/v1` → `GET|PUT /profile`.
 */
@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  /**
   * @param profileService - Lectura y actualización del perfil.
   */
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Consulta información personal y preferencias de notificación.
   *
   * @param user - Usuario del Access JWT.
   * @returns {Promise<ProfileResult>} Perfil completo.
   */
  @Get()
  @ApiOperation({
    summary: 'Consultar perfil del usuario autenticado',
    description:
      'Información personal, foto opcional y preferencias de notificación (HU-008).',
  })
  @ApiOkResponse({ description: 'Perfil encontrado' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiNotFoundResponse({ description: 'Usuario o perfil inexistente' })
  getProfile(@CurrentUser() user: AuthUser): Promise<ProfileResult> {
    return this.profileService.getProfile(user.userId);
  }

  /**
   * Actualiza datos personales y/o preferencias.
   *
   * @param user - Usuario del Access JWT.
   * @param dto - Campos opcionales a modificar.
   * @returns {Promise<UpdateProfileResult>} Perfil actualizado.
   */
  @Put()
  @ApiOperation({
    summary: 'Actualizar perfil y preferencias',
    description:
      'RN-034: cambio de email exige re-activación vía `POST /auth/activate`.',
  })
  @ApiOkResponse({ description: 'Perfil actualizado' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiBadRequestResponse({ description: 'Validación o ubicación inválida' })
  @ApiConflictResponse({ description: 'Email duplicado (RN-021)' })
  @ApiNotFoundResponse({ description: 'Usuario o perfil inexistente' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UpdateProfileResult> {
    return this.profileService.updateProfile(user.userId, dto);
  }
}
