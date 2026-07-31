import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../payments/enums/payment.enums';
import { GiftcardTheme } from '../enums/giftcard.enums';

/**
 * Body de `POST /giftcards` — compra de bono digital (HU-018).
 *
 * Incluye datos del destinatario + medio de pago (misma tokenización HU-013).
 */
export class PurchaseGiftcardDto {
  @ApiProperty({
    description:
      'Valor del bono en COP. Prefijados: 20000 / 50000 / 100000, o personalizado.',
    example: 50_000,
  })
  @IsInt()
  @Min(10_000)
  @Max(1_000_000)
  amount!: number;

  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(220)
  recipientName!: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  @MaxLength(255)
  recipientEmail!: string;

  @ApiPropertyOptional({
    example: '¡Feliz cumpleaños! Disfruta el cine.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({
    enum: GiftcardTheme,
    example: GiftcardTheme.BIRTHDAY,
    default: GiftcardTheme.GENERIC,
  })
  @IsOptional()
  @IsEnum(GiftcardTheme)
  theme?: GiftcardTheme;

  @ApiPropertyOptional({
    description:
      'ISO-8601 de envío programado. Si se omite, el correo sale al confirmar el pago.',
    example: '2026-12-24T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledSendAt?: string;

  @ApiPropertyOptional({
    description: 'Días hasta expiración (RN-078). Default del sistema si se omite.',
    example: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(730)
  expiresInDays?: number;

  @ApiPropertyOptional({
    description: 'Permitir uso parcial del saldo (RN-077). Default true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowPartialUse?: boolean;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({
    example: 'tok_demo_visa_4242',
    description: 'Token del medio (obligatorio para tarjeta).',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  paymentMethodToken?: string;

  @ApiPropertyOptional({ example: 'bancolombia' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bankCode?: string;

  @ApiPropertyOptional({
    example: 'idem-giftcard-001',
    description: 'Idempotencia de la compra (RN-056).',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  idempotencyKey?: string;
}

/**
 * Body de `POST /giftcards/redeem` — carga saldo a la billetera.
 */
export class RedeemGiftcardDto {
  @ApiProperty({ example: 'MCGC-A1B2C3D4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @ApiPropertyOptional({
    description:
      'Monto a redimir (COP). Si se omite, se carga todo el saldo restante (si allowPartialUse).',
    example: 20_000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}

/**
 * Body de `POST /giftcards/webhook` — confirmación de pasarela.
 */
export class GiftcardWebhookDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;
}
