import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { PqrsCategory } from '../enums/pqrs.enums';

/**
 * Body de `PUT /pqrs/sla` — ajustar horas SLA por categoría (RN-111).
 * Solo ADMIN+.
 */
export class UpdatePqrsSlaDto {
  @ApiProperty({ enum: PqrsCategory })
  @IsEnum(PqrsCategory)
  category!: PqrsCategory;

  @ApiProperty({
    example: 48,
    description: 'Horas de plazo (1–720 = hasta 30 días)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  hours!: number;
}
