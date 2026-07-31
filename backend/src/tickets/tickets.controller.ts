import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { TicketListResponse, TicketView } from './dto/ticket-response';
import { TicketsService } from './tickets.service';

/**
 * Entradas digitales (HU-014).
 *
 * Prefijo global `/api/v1`:
 * - `GET /tickets` — Mis compras / entradas
 * - `GET /tickets/:id` — detalle
 * - `GET /tickets/:id/pdf` — descarga PDF (RN-059)
 */
@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketsController {
  /**
   * @param ticketsService - Consulta y PDF de entradas.
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
