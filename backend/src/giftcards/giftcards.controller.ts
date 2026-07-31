import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
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
  GiftcardListResponse,
  GiftcardPurchaseResponse,
  GiftcardRedeemResponse,
  GiftcardView,
  GiftcardWebhookResult,
} from './dto/giftcard-response';
import {
  GiftcardWebhookDto,
  PurchaseGiftcardDto,
  RedeemGiftcardDto,
} from './dto/giftcard.dto';
import { GiftcardsService } from './giftcards.service';

/**
 * Bonos de regalo digitales (HU-018).
 *
 * Prefijo global `/api/v1`:
 * - `POST /giftcards` — comprar
 * - `GET  /giftcards` — listar míos
 * - `GET  /giftcards/:code` — consultar
 * - `POST /giftcards/redeem` — cargar a billetera
 * - `POST /giftcards/webhook` — confirmación pasarela (HMAC)
 */
@ApiTags('Giftcards')
@Controller('giftcards')
export class GiftcardsController {
  /**
   * @param giftcardsService - Compra / entrega / redención.
   */
  constructor(private readonly giftcardsService: GiftcardsService) {}

  /**
   * Lista bonos comprados y recibidos del usuario JWT.
   *
   * @param user - JWT.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar mis bonos de regalo',
    description: 'Comprados (como emisor) y recibidos (email del JWT, ACTIVE).',
  })
  @ApiOkResponse({ description: 'purchased + received' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listMine(@CurrentUser() user: AuthUser): Promise<GiftcardListResponse> {
    return this.giftcardsService.listMine(user.userId, user.email);
  }

  /**
   * Compra un bono: crea PENDING_PAYMENT + checkout de pasarela.
   *
   * @param user - Comprador.
   * @param dto - Valor, destinatario, pago.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Comprar bono de regalo digital',
    description:
      'Valores 20k/50k/100k o personalizado. Tras webhook APPROVED se activa ' +
      'el código/QR (RN-076) y se envía el correo (inmediato o programado).',
  })
  @ApiOkResponse({ description: 'Bono PENDING + checkoutUrl' })
  @ApiBadRequestResponse({ description: 'Monto o pago inválido' })
  @ApiConflictResponse({ description: 'Idempotencia conflictiva' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  purchase(
    @CurrentUser() user: AuthUser,
    @Body() dto: PurchaseGiftcardDto,
  ): Promise<GiftcardPurchaseResponse> {
    return this.giftcardsService.purchase(user.userId, dto);
  }

  /**
   * Redime el bono cargando saldo a la billetera Multicine.
   *
   * @param user - Quien recibe el crédito.
   * @param dto - Código + monto opcional.
   */
  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Redimir bono a billetera',
    description:
      'Acredita saldo en Wallet (HU-006/008). Uso parcial según RN-077. ' +
      'Alternativa: POST /cart/apply-giftcard en el checkout.',
  })
  @ApiOkResponse({ description: 'Saldo acreditado' })
  @ApiBadRequestResponse({ description: 'Monto inválido' })
  @ApiConflictResponse({ description: 'Expirado, redimido o sin parcial' })
  @ApiNotFoundResponse({ description: 'Código inexistente' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  redeem(
    @CurrentUser() user: AuthUser,
    @Body() dto: RedeemGiftcardDto,
  ): Promise<GiftcardRedeemResponse> {
    return this.giftcardsService.redeemToWallet(user.userId, dto);
  }

  /**
   * Confirmación de la pasarela (sin JWT; firma HMAC).
   *
   * @param dto - Ref + estado.
   * @param signature - Header `x-payment-signature`.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de pago de giftcard',
    description:
      'Misma firma HMAC que POST /payments/webhook (PAYMENT_WEBHOOK_SECRET).',
  })
  @ApiHeader({
    name: 'x-payment-signature',
    required: true,
    description: 'HMAC-SHA256 hex(ref:status:amount)',
  })
  @ApiOkResponse({ description: 'Bono ACTIVE o CANCELLED' })
  @ApiUnauthorizedResponse({ description: 'Firma inválida' })
  @ApiNotFoundResponse({ description: 'Referencia desconocida' })
  webhook(
    @Body() dto: GiftcardWebhookDto,
    @Headers('x-payment-signature') signature: string | undefined,
  ): Promise<GiftcardWebhookResult> {
    return this.giftcardsService.handleWebhook(dto, signature);
  }

  /**
   * Consulta un bono por código único.
   *
   * @param code - `MCGC-…`.
   */
  @Get(':code')
  @ApiOperation({
    summary: 'Consultar bono por código',
    description: 'Devuelve saldo, estado y QR payload (RN-076/078).',
  })
  @ApiOkResponse({ description: 'Detalle del bono' })
  @ApiNotFoundResponse({ description: 'Código inexistente' })
  getByCode(@Param('code') code: string): Promise<GiftcardView> {
    return this.giftcardsService.getByCode(code);
  }
}
