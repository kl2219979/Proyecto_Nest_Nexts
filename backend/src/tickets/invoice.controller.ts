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
import { InvoiceView } from './dto/ticket-response';
import { TicketsService } from './tickets.service';

/**
 * Factura / comprobante electrónico (HU-014).
 *
 * Prefijo global `/api/v1` (ruta singular según backlog):
 * - `GET /invoice/:id` — detalle
 * - `GET /invoice/:id/pdf` — descarga PDF
 */
@ApiTags('Invoice')
@Controller('invoice')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceController {
  /**
   * @param ticketsService - Emisión y consulta de facturas.
   */
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * PDF de factura.
   *
   * @param user - JWT.
   * @param id - UUID de la factura.
   * @param res - Headers de descarga.
   * @returns Stream PDF.
   */
  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Descargar PDF de factura',
    description: 'Comprobante con resumen de compra (RN-059).',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'PDF de la factura' })
  @ApiNotFoundResponse({ description: 'No existe' })
  @ApiForbiddenResponse({ description: 'No es del usuario' })
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.ticketsService.getInvoicePdf(
      user.userId,
      id,
    );
    res.set({
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  /**
   * Detalle de factura asociada a la compra.
   *
   * @param user - JWT.
   * @param id - UUID.
   * @returns Vista de factura.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Consultar factura electrónica',
    description: 'Factura 1:1 con la orden pagada; incluye líneas y totales.',
  })
  @ApiOkResponse({ description: 'Detalle de la factura' })
  @ApiNotFoundResponse({ description: 'No existe' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  getMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceView> {
    return this.ticketsService.getInvoiceMine(user.userId, id);
  }
}
