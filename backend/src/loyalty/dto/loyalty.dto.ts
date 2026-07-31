import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { PointsRedeemDestination } from '../enums/loyalty.enums';

/**
 * Body de `POST /points` — redime puntos a billetera (bonos) (HU-023).
 *
 * Entradas/confitería se redimen vía `POST /cart/apply-points`.
 */
export class RedeemPointsDto {
  @ApiProperty({
    example: 100,
    description: 'Puntos a redimir (enteros positivos)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points!: number;

  @ApiProperty({
    enum: PointsRedeemDestination,
    example: PointsRedeemDestination.WALLET,
    description: 'Destino del valor: crédito COP en billetera',
  })
  @IsEnum(PointsRedeemDestination)
  destination!: PointsRedeemDestination;
}

/**
 * Body de `POST /cart/apply-points` (HU-023).
 */
export class ApplyPointsDto {
  @ApiProperty({
    example: 50,
    description: 'Puntos a aplicar como descuento en el total del carrito',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points!: number;
}
