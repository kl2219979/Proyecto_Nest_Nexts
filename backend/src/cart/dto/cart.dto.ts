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
 * Body de `POST /cart/apply-promo` (stub RN-048 hasta HU-026).
 */
export class ApplyPromoDto {
  @ApiProperty({ example: 'MULTICINE10', description: 'Código de cupón' })
  @IsString()
  @MaxLength(40)
  code!: string;
}

/**
 * Cupones de demostración hasta el CRUD de promociones (HU-026).
 *
 * Permite ejercitar RN-048 (no combinación) sin inventar el módulo admin.
 */
export const DEMO_PROMOS: Record<
  string,
  { discountAmount: number; stackable: boolean; description: string }
> = {
  MULTICINE10: {
    discountAmount: 10000,
    stackable: false,
    description: 'Demo: $10.000 off (no apilable)',
  },
  SNACK5K: {
    discountAmount: 5000,
    stackable: true,
    description: 'Demo: $5.000 off (apilable)',
  },
};
