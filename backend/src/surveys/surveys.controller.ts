import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SurveyListResponse, SurveyView } from './dto/survey-response';
import { SurveysService } from './surveys.service';

/**
 * Encuestas de satisfacción post-visita (HU-027).
 *
 * Prefijo global `/api/v1`:
 * - `POST /surveys` — responder encuesta (RN-108 / RN-109)
 * - `GET  /surveys` — listar mis encuestas
 * - `GET  /surveys/:id` — consultar una encuesta propia
 */
@ApiTags('Surveys')
@Controller('surveys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SurveysController {
  /**
   * @param surveysService - Alta y consulta de encuestas.
   */
  constructor(private readonly surveysService: SurveysService) {}

  /**
   * Lista las encuestas que el usuario ya respondió.
   *
   * @param user - JWT.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar mis encuestas de satisfacción',
    description: 'Consulta las respuestas enviadas por el usuario autenticado.',
  })
  @ApiOkResponse({ description: 'Listado de encuestas' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listMine(@CurrentUser() user: AuthUser): Promise<SurveyListResponse> {
    return this.surveysService.listMine(user.userId);
  }

  /**
   * Consulta una encuesta propia por id.
   *
   * @param user - JWT.
   * @param id - UUID de la encuesta.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Consultar una encuesta propia',
    description: 'Devuelve la encuesta si pertenece al usuario JWT.',
  })
  @ApiOkResponse({ description: 'Encuesta encontrada' })
  @ApiNotFoundResponse({ description: 'No existe o no es del usuario' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  getMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SurveyView> {
    return this.surveysService.getMine(user.userId, id);
  }

  /**
   * Registra la encuesta de una compra ya asistida.
   *
   * @param user - JWT (debe tener ticket USED de la orden).
   * @param dto - Calificaciones + orderId.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Responder encuesta de satisfacción',
    description:
      'RN-108: solo quien asistió (ticket USED). RN-109: una encuesta por compra. ' +
      'Aspectos 1–5 · probabilidad de recomendar 0–10.',
  })
  @ApiCreatedResponse({ description: 'Encuesta creada' })
  @ApiForbiddenResponse({
    description: 'Sin asistencia o orden no pagada (RN-108)',
  })
  @ApiConflictResponse({
    description: 'Ya existe encuesta para esa compra (RN-109)',
  })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSurveyDto,
  ): Promise<SurveyView> {
    return this.surveysService.create(user.userId, dto);
  }
}
