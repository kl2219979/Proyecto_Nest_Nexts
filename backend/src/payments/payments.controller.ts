import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
  PaymentListResponse,
  PaymentResponse,
  WebhookResult,
} from './dto/payment-response';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

/**
 * Pagos seguros (HU-013).
 *
 * Prefijo global `/api/v1`:
 * - `POST /payments` — iniciar cobro (JWT)
 * - `GET  /payments` — listar mis pagos (JWT)
 * - `GET  /payments/:id` — detalle (JWT)
 * - `POST /payments/webhook` — confirmación pasarela (firma HMAC)
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  /**
   * @param paymentsService - Orquestación de cobro y webhook.
   */
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Inicia el pago del carrito ACTIVE.
   *
   * @param user - JWT.
   * @param dto - Medio + token + idempotency.
   * @returns Pago PENDING (confirmación solo vía webhook, RN-053).
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear pago desde el carrito activo',
    description:
      'Valida sillas y stock, genera orden, cifra payload AES-256 y deja el cobro PENDING hasta el webhook (RN-053…056).',
  })
  @ApiCreatedResponse({ description: 'Pago PENDING creado' })
  @ApiBadRequestResponse({ description: 'Carrito inválido o sin token de tarjeta' })
  @ApiConflictResponse({ description: 'Pago duplicado (RN-056)' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    return this.paymentsService.create(user.userId, dto);
  }

  /**
   * Lista pagos del usuario autenticado.
   *
   * @param user - JWT.
   * @returns Últimos pagos.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mis pagos' })
  @ApiOkResponse({ description: 'Lista de pagos' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listMine(@CurrentUser() user: AuthUser): Promise<PaymentListResponse> {
    return this.paymentsService.listMine(user.userId);
  }

  /**
   * Webhook de la pasarela (sin JWT; firma HMAC).
   *
   * Declarado antes de `:id` para no capturar "webhook" como UUID.
   *
   * @param dto - Ref + estado.
   * @param signature - Header `x-payment-signature`.
   * @returns Resultado de aprobación o rechazo.
   */
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook de confirmación de pasarela',
    description:
      'Valida firma HMAC. APPROVED → sillas SOLD + stock; REJECTED → libera sillas (RN-053/054).',
  })
  @ApiHeader({
    name: 'x-payment-signature',
    description:
      'HMAC-SHA256 hex de `{gatewayReference}:{status}:{amount}` con PAYMENT_WEBHOOK_SECRET',
    required: true,
  })
  @ApiOkResponse({ description: 'Webhook procesado' })
  @ApiUnauthorizedResponse({ description: 'Firma inválida' })
  @ApiNotFoundResponse({ description: 'Pago no encontrado' })
  webhook(
    @Body() dto: PaymentWebhookDto,
    @Headers('x-payment-signature') signature: string | undefined,
  ): Promise<WebhookResult> {
    return this.paymentsService.handleWebhook(dto, signature);
  }

  /**
   * Detalle de un pago propio.
   *
   * @param user - JWT.
   * @param id - UUID del pago.
   * @returns Pago + orden.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar un pago propio' })
  @ApiOkResponse({ description: 'Detalle del pago' })
  @ApiNotFoundResponse({ description: 'No existe' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  getMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponse> {
    return this.paymentsService.getMine(user.userId, id);
  }
}
