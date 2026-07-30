import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../enums/payment.enums';

/**
 * Body de `POST /payments` (HU-013).
 *
 * No acepta número de tarjeta: solo medio + token (tokenización).
 */
export class CreatePaymentDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
    description: 'Medio de pago (Apple/Google Pay = futuro).',
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({
    example: 'tok_demo_visa_4242',
    description:
      'Token del medio (obligatorio para tarjeta). Nunca enviar PAN/CVV.',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  paymentMethodToken?: string;

  @ApiPropertyOptional({
    example: 'bancolombia',
    description: 'Código de banco (útil en PSE demo).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bankCode?: string;

  @ApiPropertyOptional({
    example: 'idem-checkout-001',
    description:
      'Clave de idempotencia (RN-056). Si se omite, el servidor genera una.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  idempotencyKey?: string;
}

/**
 * Body de `POST /payments/webhook` (pasarela → API).
 *
 * La firma HMAC va en header `x-payment-signature` (RN-053).
 */
export class PaymentWebhookDto {
  @ApiProperty({ example: 'gw_abc123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  gatewayReference!: string;

  @ApiProperty({
    enum: [PaymentStatus.APPROVED, PaymentStatus.REJECTED],
    example: PaymentStatus.APPROVED,
  })
  @IsIn([PaymentStatus.APPROVED, PaymentStatus.REJECTED])
  status!: PaymentStatus.APPROVED | PaymentStatus.REJECTED;

  @ApiPropertyOptional({
    description: 'Monto reportado por la pasarela (debe coincidir).',
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'UUID del pago (opcional; se resuelve por gatewayReference).',
  })
  @IsOptional()
  @IsUUID()
  paymentId?: string;
}
