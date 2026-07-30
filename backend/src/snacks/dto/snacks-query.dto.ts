import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SnackCategory } from '../enums/snack.enums';

/**
 * Query de `GET /snacks` (HU-012).
 */
export class SnacksQueryDto {
  /**
   * Filtra por complejo (pickup).
   * Incluye productos globales (`cinemaId` null) + los de ese cine.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  cinemaId?: string;

  /** Filtra por categoría de menú. */
  @ApiPropertyOptional({ enum: SnackCategory })
  @IsOptional()
  @IsEnum(SnackCategory)
  category?: SnackCategory;
}
