import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user.enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import {
  TicketListResponse,
  TicketValidationResult,
  TicketView,
  FulfillmentDocuments,
} from './dto/ticket-response';
import { RegenerateTicketsDto } from './dto/regenerate-tickets.dto';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { TicketsService } from './tickets.service';

/**
 * Entradas digitales y validación en puerta (HU-014 / HU-024 / HU-016).
 *
 * Prefijo global `/api/v1`:
 * - `GET /tickets` — Mis compras / entradas
 * - `POST /tickets/validate` — Escaneo QR (STAFF+, HU-020 / RN-088)
 * - `POST /tickets/regenerate` — Nuevos QR tras reprogramar (HU-016)
 * - `GET /tickets/:id` — detalle
 * - `GET /tickets/:id/pdf` — descarga PDF (RN-059)
 */
@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketsController {
  /**
   * @param ticketsService - Consulta, PDF y validación en puerta.
   */
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Lista entradas del usuario autenticado.
   *
   * @param user - JWT.
   * @returns Entradas con QR y enlace PDF.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar mis entradas digitales',
    description:
      'Mis compras: cada entrada tiene QR único (RN-057) y PDF re-descargable (RN-059).',
  })
  @ApiOkResponse({ description: 'Lista de entradas' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listMine(@CurrentUser() user: AuthUser): Promise<TicketListResponse> {
    return this.ticketsService.listMine(user.userId);
  }

  /**
   * Escaneo de QR en puerta (HU-024 / RN-102…104 + HU-020 RBAC).
   *
   * Declarado antes de `:id` para no colisionar con rutas dinámicas.
   * Requiere rol STAFF o superior (RN-088).
   *
   * @param user - JWT del colaborador.
   * @param dto - Payload leído del QR.
   * @returns Ingreso autorizado + datos de función/sala.
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF)
  @ApiOperation({
    summary: 'Validar QR de entrada en puerta',
    description:
      'Comprueba existencia, compra pagada y estado VALID; marca UTILIZADA (RN-102). ' +
      'Registra fecha/hora (RN-103) y colaborador (RN-104). Requiere rol STAFF+ (HU-020).',
  })
  @ApiOkResponse({ description: 'Ingreso autorizado; entrada marcada USED' })
  @ApiNotFoundResponse({ description: 'QR desconocido' })
  @ApiConflictResponse({
    description: 'QR ya usado, anulado o compra no pagada',
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente (se requiere STAFF+)' })
  validate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidateTicketDto,
  ): Promise<TicketValidationResult> {
    return this.ticketsService.validateQr(user.userId, dto.qrPayload);
  }

  /**
   * Regenera entradas/QR de una orden tras actualizar sus líneas (HU-016).
   *
   * Normalmente lo invoca el flujo `PUT /orders/:id/reschedule`.
   * Expuesto para reintentos operativos si la regeneración falló a medias.
   *
   * @param user - JWT.
   * @param dto - `orderId` PAID sin entradas VALID vigentes.
   */
  @Post('regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerar entradas digitales de una orden',
    description:
      'Emite nuevos códigos/QR (RN-068) sobre las líneas actuales. ' +
      'Requiere que no existan entradas VALID previas (ya anuladas).',
  })
  @ApiOkResponse({ description: 'Entradas regeneradas' })
  @ApiConflictResponse({
    description: 'Aún hay VALID, orden no PAID o sin líneas',
  })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  regenerate(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegenerateTicketsDto,
  ): Promise<FulfillmentDocuments> {
    return this.ticketsService.regenerateTicketsForOrder(
      dto.orderId,
      user.userId,
    );
  }

  /**
   * PDF de una entrada (declarado antes de `:id`).
   *
   * @param user - JWT.
   * @param id - UUID de la entrada.
   * @param res - Headers de descarga.
   * @returns Stream PDF.
   */
  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Descargar PDF de una entrada',
    description: 'Regenera el PDF con QR embebido (RN-059).',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'PDF de la entrada' })
  @ApiNotFoundResponse({ description: 'No existe' })
  @ApiForbiddenResponse({ description: 'No es del usuario' })
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.ticketsService.getTicketPdf(
      user.userId,
      id,
    );
    res.set({
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  /**
   * Detalle de una entrada propia.
   *
   * @param user - JWT.
   * @param id - UUID.
   * @returns Vista de entrada.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Consultar una entrada propia' })
  @ApiOkResponse({ description: 'Detalle de la entrada' })
  @ApiNotFoundResponse({ description: 'No existe' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  getMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TicketView> {
    return this.ticketsService.getMine(user.userId, id);
  }
}
