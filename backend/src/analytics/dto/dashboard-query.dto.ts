import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { DashboardPeriod } from '../enums/dashboard.enums';

/**
 * Filtros del dashboard gerencial (HU-025).
 *
 * - `period`: granularidad + rango por defecto.
 * - `from` / `to`: ISO date (`YYYY-MM-DD`) que anulan el rango del período.
 * - `cityId` / `cinemaId`: recorte geográfico / por complejo.
 */
export class DashboardQueryDto {
  @ApiPropertyOptional({
    enum: DashboardPeriod,
    default: DashboardPeriod.MONTHLY,
    description: 'Ventana de indicadores (daily|weekly|monthly|yearly)',
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.MONTHLY;

  @ApiPropertyOptional({
    description: 'Inicio inclusive (YYYY-MM-DD). Sobrescribe el rango del period.',
    example: '2026-07-01',
  })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fin inclusive (YYYY-MM-DD).',
    example: '2026-07-31',
  })
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ciudad (UUID).' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por complejo (UUID).' })
  @IsOptional()
  @IsUUID()
  cinemaId?: string;

  @ApiPropertyOptional({
    description: 'Límite de rankings (top películas / ciudades / complejos).',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
