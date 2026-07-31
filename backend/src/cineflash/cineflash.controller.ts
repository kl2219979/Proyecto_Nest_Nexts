import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/enums/user.enums';
import { CineflashService } from './cineflash.service';
import { CineFlashProcessResult } from './dto/cineflash-response';

/**
 * Trigger manual del procesador Cine Flash (HU-019).
 *
 * Prefijo global `/api/v1`:
 * - `POST /cineflash/process` — misma lógica que el cron cada 5 min
 *
 * Listado público: `GET /movies/cineflash`.
 */
@ApiTags('Cine Flash')
@Controller('cineflash')
export class CineflashController {
  /**
   * @param cineflashService - Motor de activación / apagado.
   */
  constructor(private readonly cineflashService: CineflashService) {}

  /**
   * Ejecuta una pasada del job (útil en demos / admin sin esperar el cron).
   *
   * @returns Resumen activated / deactivated / notificaciones.
   */
  @Post('process')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Procesar Cine Flash ahora',
    description:
      'RN-080…086: evalúa funciones a ~1 h, activa 20% OFF si ocupación < 60%, apaga al llenar/iniciar. Equivalente al cron cada 5 min.',
  })
  @ApiOkResponse({ description: 'Resumen de la pasada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN+' })
  process(): Promise<CineFlashProcessResult> {
    return this.cineflashService.process();
  }
}
