import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
  PersonalizedFeedResponse,
  UpsertPreferencesResponse,
} from './dto/recommendations-response';
import {
  RecommendationsQueryDto,
  UpsertRecommendationPreferencesDto,
} from './dto/recommendations.dto';
import { RecommendationsService } from './recommendations.service';

/**
 * Endpoints del motor de recomendaciones personalizadas (HU-022).
 *
 * Prefijo global `/api/v1`:
 * - `GET  /recommendations` — feed personalizado (historial + prefs)
 * - `POST /recommendations/preferences` — consentimiento y gustos
 *
 * RN-096 actualización diaria · RN-097 solo info autorizada ·
 * RN-098 excluye películas vistas recientemente.
 */
@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationsController {
  /**
   * @param recommendationsService - Scoring + preferencias + cache.
   */
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Feed personalizado para la ciudad indicada.
   *
   * Usa snapshot del día si existe (RN-096); si no, calcula y guarda.
   *
   * @param user - JWT.
   * @param query - `cityId` de contexto.
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener recomendaciones personalizadas',
    description:
      'Analiza historial autorizado, preferencias y cartelera de la ciudad. ' +
      'Excluye películas vistas en la ventana configurable (RN-098).',
  })
  @ApiOkResponse({ description: 'Feed personalizado' })
  @ApiBadRequestResponse({ description: 'Query inválido' })
  @ApiNotFoundResponse({ description: 'Ciudad no encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  getFeed(
    @CurrentUser() user: AuthUser,
    @Query() query: RecommendationsQueryDto,
  ): Promise<PersonalizedFeedResponse> {
    return this.recommendationsService.getFeed(user.userId, query.cityId);
  }

  /**
   * Guarda preferencias / consentimiento e invalida el cache diario.
   *
   * @param user - JWT.
   * @param dto - Campos a actualizar (parcial).
   */
  @Post('preferences')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Configurar preferencias de recomendaciones',
    description:
      'Upsert de consentimiento (RN-097), ventana de exclusión (RN-098) ' +
      'y gustos explícitos (géneros, formatos, idiomas, complejos, horarios).',
  })
  @ApiOkResponse({ description: 'Preferencias actualizadas' })
  @ApiBadRequestResponse({ description: 'Body inválido' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  upsertPreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertRecommendationPreferencesDto,
  ): Promise<UpsertPreferencesResponse> {
    return this.recommendationsService.upsertPreferences(user.userId, dto);
  }
}
