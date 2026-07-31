import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Body opcional de `POST /cart`.
 *
 * Sin body: usa la reserva temporal activa del usuario (HU-010).
 * Con `reservationId`: fija qué grupo de locks entra al carrito.
 */
export class CreateCartDto {
  /**
   * Reserva de sillas a incorporar.
   * Si se omite y hay exactamente una activa, se usa esa.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'reservationId debe ser UUID' })
  reservationId?: string;
}

/**
 * Body de `PUT /cart` — quitar sillas (HU-011).
 *
 * Confitería: `POST|PUT|DELETE /cart/snacks` (HU-012).
 */
export class UpdateCartDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Sillas a quitar del carrito y liberar (RN-041)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  removeSeatIds?: string[];
}

/**
 * Body de `POST /cart/apply-promo` (HU-026 / catálogo admin).
 */
export class ApplyPromoDto {
  @ApiProperty({ example: 'MULTICINE10', description: 'Código de cupón' })
  @IsString()
  @MaxLength(40)
  code!: string;
}

/**
 * Body de `POST /cart/apply-giftcard` (HU-018).
 */
export class ApplyGiftcardDto {
  @ApiProperty({ example: 'MCGC-A1B2C3D4', description: 'Código del bono' })
  @IsString()
  @MaxLength(40)
  code!: string;
}
