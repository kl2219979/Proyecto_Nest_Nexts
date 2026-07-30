import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { AudioType, MovieFormat, RoomType } from '../enums/movie.enums';

/**
 * Query de `GET /movies/:id/functions` (HU-009).
 *
 * `cityId` obligatorio (contexto de ubicación). El resto permite
 * filtrar sin “recargar” el catálogo completo: el frontend puede
 * pedir solo el formato/complejo/fecha elegidos.
 */
export class MovieFunctionsQueryDto {
  @ApiProperty({
    description: 'UUID de la ciudad (contexto de ubicación)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  cityId!: string;

  @ApiPropertyOptional({
    description: 'Filtrar por día (YYYY-MM-DD)',
    example: '2026-07-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Complejo de cine' })
  @IsOptional()
  @IsUUID('4', { message: 'cinemaId debe ser un UUID válido' })
  cinemaId?: string;

  @ApiPropertyOptional({ enum: MovieFormat })
  @IsOptional()
  @IsEnum(MovieFormat, { message: 'format inválido' })
  format?: MovieFormat;

  @ApiPropertyOptional({ example: 'ES' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: AudioType })
  @IsOptional()
  @IsEnum(AudioType)
  audioType?: AudioType;

  @ApiPropertyOptional({ enum: RoomType })
  @IsOptional()
  @IsEnum(RoomType, { message: 'roomType inválido' })
  roomType?: RoomType;

  /**
   * Si es `true`, oculta funciones agotadas (solo seleccionables).
   */
  @ApiPropertyOptional({
    description: 'Excluye funciones agotadas',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === true || value === 'true' || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === '0') {
      return false;
    }
    return value;
  })
  @IsBoolean({ message: 'available debe ser boolean' })
  available?: boolean;
}
