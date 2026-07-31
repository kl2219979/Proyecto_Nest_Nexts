import {
  Body,
  Controller,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { OAuthTokenDto } from '../dto/api-client.dto';
import type { OAuthTokenResponse } from '../dto/api-client-response';
import { PublicApiAuditInterceptor } from '../interceptors/public-api-audit.interceptor';
import { ApiClientsService } from '../services/api-clients.service';

/**
 * OAuth 2.0 Client Credentials para apps externas (HU-029).
 *
 * Prefijo global `/api/v1` → `POST /api/v1/oauth/token`.
 *
 * El access token resultante se envía como:
 * - `Authorization: Bearer …` en rutas solo-máquina, o
 * - `X-Client-Token: Bearer …` si también se manda JWT de usuario.
 */
@ApiTags('Public API · OAuth')
@Controller('oauth')
@UseInterceptors(PublicApiAuditInterceptor)
export class OAuthController {
  /**
   * @param clients - Emisión de tokens client_credentials.
   */
  constructor(private readonly clients: ApiClientsService) {}

  /**
   * Emite access token de cliente (no de usuario final).
   *
   * @param dto - grant_type, client_id, client_secret.
   * @param _req - Request (auditoría vía interceptor).
   */
  @Post('token')
  @ApiOperation({
    summary: 'OAuth 2.0 Client Credentials',
    description:
      'RN-113/114 · Emite JWT de API client (1 h). Alternativa: header X-API-Key.',
  })
  @ApiOkResponse({ description: 'access_token + expires_in + scope' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  token(
    @Body() dto: OAuthTokenDto,
    @Req() _req: Request,
  ): Promise<OAuthTokenResponse> {
    return this.clients.issueClientCredentialsToken(
      dto.client_id,
      dto.client_secret,
      dto.grant_type,
    );
  }
}
