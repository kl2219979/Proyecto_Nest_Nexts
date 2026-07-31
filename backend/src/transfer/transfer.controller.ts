import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { AcceptTransferDto, TransferTicketsDto } from './dto/transfer.dto';
import {
  TransferAcceptResponse,
  TransferCreateResponse,
  TransferListResponse,
} from './dto/transfer-response';
import { TransferService } from './transfer.service';

/**
 * Cesión de entradas a otro usuario (HU-017).
 *
 * Prefijo global `/api/v1`:
 * - `POST /tickets/transfer` — solicitar
 * - `GET  /tickets/transfer` — enviadas / recibidas
 * - `POST /tickets/transfer/accept` — aceptar (RN-073)
 */
@ApiTags('Tickets / Transfer')
@Controller('tickets/transfer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransferController {
  /**
   * @param transferService - Orquestación de cesión + auditoría.
   */
  constructor(private readonly transferService: TransferService) {}

  /**
   * Lista cesiones del usuario (enviadas y recibidas).
   *
   * @param user - JWT.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar mis transferencias de entradas',
    description:
      'Enviadas (como emisor) y recibidas (por userId o email de invitación).',
  })
  @ApiOkResponse({ description: 'Listados sent / received' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listMine(@CurrentUser() user: AuthUser): Promise<TransferListResponse> {
    return this.transferService.listMine(user.userId, user.email);
  }

  /**
   * Solicita cesión de una o varias entradas.
   *
   * @param user - JWT titular.
   * @param dto - Entradas + datos del destinatario.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transferir entradas a otro usuario',
    description:
      'Crea una cesión PENDING. El QR no cambia hasta que el destinatario acepte (RN-073). ' +
      'Si no hay cuenta, se envía invitación a registrarse. RN-071 ventana 1 h · RN-072 una sola vez.',
  })
  @ApiOkResponse({ description: 'Transferencia PENDING creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o mismo correo' })
  @ApiConflictResponse({
    description: 'Fuera de ventana, ya transferida o PENDING previa',
  })
  @ApiForbiddenResponse({ description: 'No eres titular' })
  @ApiNotFoundResponse({ description: 'Entrada inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  request(
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferTicketsDto,
  ): Promise<TransferCreateResponse> {
    return this.transferService.requestTransfer(user.userId, dto);
  }

  /**
   * Acepta la cesión: anula QR viejos y emite nuevos (RN-073/074).
   *
   * @param user - JWT del destinatario.
   * @param dto - transferId o acceptToken del correo.
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aceptar transferencia de entradas',
    description:
      'El correo del JWT debe coincidir con el destinatario. ' +
      'Invalida QR anteriores y genera nuevos a nombre del aceptante (RN-074/075).',
  })
  @ApiOkResponse({ description: 'Cesión completada + nuevos QR' })
  @ApiBadRequestResponse({ description: 'Falta transferId/acceptToken' })
  @ApiConflictResponse({
    description: 'Ya aceptada, expirada o entradas no VALID',
  })
  @ApiForbiddenResponse({ description: 'No eres el destinatario' })
  @ApiNotFoundResponse({ description: 'Transferencia no encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  accept(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptTransferDto,
  ): Promise<TransferAcceptResponse> {
    return this.transferService.acceptTransfer(user.userId, user.email, dto);
  }
}
