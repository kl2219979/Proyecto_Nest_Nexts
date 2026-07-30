import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * Body de `POST /cart/snacks` — agregar confitería (HU-012).
 */
export class AddCartSnackDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  snackId!: string;

  @ApiProperty({ example: 1, minimum: 1, default: 1 })
  @IsInt()
  @Min(1, { message: 'quantity debe ser ≥ 1' })
  quantity!: number;
}

/**
 * Body de `PUT /cart/snacks` — cambiar cantidad (HU-012).
 */
export class UpdateCartSnackDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  snackId!: string;

  @ApiProperty({
    example: 2,
    minimum: 1,
    description: 'Nueva cantidad total en el carrito (≥ 1). Para quitar usa DELETE.',
  })
  @IsInt()
  @Min(1, { message: 'quantity debe ser ≥ 1' })
  quantity!: number;
}

/**
 * Body / query de `DELETE /cart/snacks` (HU-012).
 */
export class RemoveCartSnackDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  snackId!: string;

  /**
   * Si se omite, elimina toda la línea del snack.
   * Si se indica, resta esa cantidad (mínimo 1 restante o borra línea).
   */
  @ApiPropertyOptional({
    example: 1,
    description: 'Cantidad a restar; omitir = quitar la línea completa',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
