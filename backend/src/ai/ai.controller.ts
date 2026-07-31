import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/jwt/optional-jwt-auth.guard';
import { AuthUser } from '../auth/jwt/jwt.strategy';
import { AiService } from './ai.service';
import { ChatHistoryResponse, ChatResponse } from './dto/ai-response';
import { ChatHistoryRequestDto, ChatRequestDto } from './dto/ai.dto';

/**
 * Chatbot de recomendaciones de películas (HU-021).
 *
 * Prefijo global `/api/v1`:
 * - `POST /ai/chat` — turno de conversación
 * - `POST /ai/history` — historial de una sesión
 *
 * Visitante o usuario autenticado (`OptionalJwtAuthGuard`).
 */
@ApiTags('AI Chat')
@Controller('ai')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  /**
   * @param aiService - Orquestador del chatbot.
   */
  constructor(private readonly aiService: AiService) {}

  /**
   * Envía un mensaje al asistente y recibe recomendaciones reales.
   *
   * @param dto - Mensaje + cityId + edad/prefs opcionales.
   * @param user - JWT opcional.
   * @returns Reply + tarjetas + escalado + latencia.
   */
  @Post('chat')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Chatbot: enviar mensaje',
    description:
      'RN-091…095: recomienda solo cartelera de la ciudad, prioriza cupo, ' +
      'respeta clasificación etaria, mide latencia y puede escalar a humano.',
  })
  @ApiOkResponse({ description: 'Respuesta del asistente' })
  chat(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<ChatResponse> {
    return this.aiService.chat(dto, user?.userId ?? null);
  }

  /**
   * Consulta el historial persistido de una sesión.
   *
   * @param dto - `sessionId`.
   * @param user - JWT opcional (necesario si la sesión tiene dueño).
   * @returns Mensajes ordenados.
   */
  @Post('history')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Chatbot: historial de sesión',
    description:
      'Registra y consulta el historial de conversaciones (criterio de aceptación HU-021).',
  })
  @ApiOkResponse({ description: 'Historial de la sesión' })
  history(
    @Body() dto: ChatHistoryRequestDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<ChatHistoryResponse> {
    return this.aiService.getHistory(dto.sessionId, user?.userId ?? null);
  }
}
