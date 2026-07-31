import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DEFAULT_RECENTLY_VIEWED_DAYS,
  MAX_RECENTLY_VIEWED_DAYS,
  MIN_RECENTLY_VIEWED_DAYS,
} from '../recommendations.constants';

/**
 * Query de `GET /recommendations` (HU-022).
 */
export class RecommendationsQueryDto {
  @ApiProperty({
    description: 'Ciudad de contexto para funciones futuras',
    example: 'uuid-ciudad-medellin',
  })
  @IsUUID()
  cityId!: string;
}

/**
 * Body de `POST /recommendations/preferences` (HU-022).
 *
 * Upsert parcial: solo actualiza campos enviados.
 * RN-097 / RN-098 viven aquí (consentimiento + ventana de exclusión).
 */
export class UpsertRecommendationPreferencesDto {
  @ApiPropertyOptional({
    description: 'RN-097: autorizar análisis del historial de compras',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowPurchaseHistory?: boolean;

  @ApiPropertyOptional({
    description: 'RN-097: autorizar señales del perfil (cine favorito)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowProfileSignals?: boolean;

  @ApiPropertyOptional({
    description: 'RN-098: días para no recomendar películas ya vistas',
    default: DEFAULT_RECENTLY_VIEWED_DAYS,
    minimum: MIN_RECENTLY_VIEWED_DAYS,
    maximum: MAX_RECENTLY_VIEWED_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_RECENTLY_VIEWED_DAYS)
  @Max(MAX_RECENTLY_VIEWED_DAYS)
  recentlyViewedDays?: number;

  @ApiPropertyOptional({
    description: 'Géneros favoritos (nombres)',
    type: [String],
    example: ['Acción', 'Comedia'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  favoriteGenres?: string[];

  @ApiPropertyOptional({
    description: 'Formatos preferidos',
    type: [String],
    example: ['IMAX', 'VIP'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  preferredFormats?: string[];

  @ApiPropertyOptional({
    description: 'Idiomas preferidos',
    type: [String],
    example: ['ES'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  preferredLanguages?: string[];

  @ApiPropertyOptional({
    description: 'UUIDs de complejos preferidos',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  preferredCinemaIds?: string[];

  @ApiPropertyOptional({
    description: 'Días preferidos (0=domingo … 6=sábado)',
    type: [Number],
    example: [5],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  preferredWeekdays?: number[];

  @ApiPropertyOptional({
    description: 'Hora desde (0–23) de la franja preferida',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  preferredHourFrom?: number | null;

  @ApiPropertyOptional({
    description: 'Hora hasta (0–23) de la franja preferida',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  preferredHourTo?: number | null;
}
