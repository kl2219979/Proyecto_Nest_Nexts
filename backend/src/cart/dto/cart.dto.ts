import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
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
 * Snack provisional en `PUT /cart` (estructura hasta catálogo HU-012).
 *
 * No valida inventario aquí; HU-012 endurecerá stock y categorías.
 */
export class UpsertCartSnackDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  snackId!: string;

  @ApiProperty({ example: 'Crispetas grandes' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/snacks/popcorn.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt({ message: 'quantity debe ser entero' })
  @Min(1, { message: 'No se permiten cantidades menores a 1' })
  quantity!: number;

  @ApiProperty({ example: 12000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'unitPrice no puede ser negativo' })
  unitPrice!: number;
}

/**
 * Body de `PUT /cart` — modificar compra antes del pago.
 *
 * - `removeSeatIds`: quita entradas y libera esos locks.
 * - `snacks`: reemplaza líneas de confitería (catálogo real = HU-012).
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

  @ApiPropertyOptional({
    type: [UpsertCartSnackDto],
    description:
      'Reemplazo completo de confitería. Vacío = dejar snacks actuales. `null` no aplica; omitir = no tocar.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCartSnackDto)
  snacks?: UpsertCartSnackDto[];
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
