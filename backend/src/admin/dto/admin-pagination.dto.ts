import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Paginación simple para listados del backoffice (HU-020).
 */
export class AdminPaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Búsqueda libre (email, título, …)' })
  @IsOptional()
  @IsString()
  q?: string;
}

/**
 * Respuesta paginada genérica.
 */
export type AdminPage<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};
