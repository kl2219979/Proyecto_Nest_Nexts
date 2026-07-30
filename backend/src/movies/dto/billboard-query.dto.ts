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
 * Query params de `GET /movies` y `GET /movies/today` (HU-003).
 *
 * `cityId` es obligatorio: la cartelera siempre se filtra por ciudad.
 * El resto son filtros opcionales del backlog.
 */
export class BillboardQueryDto {
  /**
   * Ciudad seleccionada por el visitante (contexto HU-002).
   *
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  @ApiProperty({
    description: 'UUID de la ciudad (contexto de ubicación)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  cityId!: string;

  /**
   * Fecha concreta dentro de la ventana de 7 días (YYYY-MM-DD).
   * Si se omite en `/movies`, se incluyen los siete días (RN-012).
   * En `/movies/today` el service ignora este valor y usa hoy.
   */
  @ApiPropertyOptional({
    description: 'Filtrar un día (YYYY-MM-DD) dentro de la ventana semanal',
    example: '2026-07-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date?: string;

  /** Nombre del género (coincidencia parcial, case-insensitive). */
  @ApiPropertyOptional({ example: 'Acción' })
  @IsOptional()
  @IsString()
  genre?: string;

  /** Clasificación etaria exacta. */
  @ApiPropertyOptional({ example: '12+' })
  @IsOptional()
  @IsString()
  classification?: string;

  /** Código de idioma de la función (ej. ES, EN). */
  @ApiPropertyOptional({ example: 'ES' })
  @IsOptional()
  @IsString()
  language?: string;

  /** Tipo de sala. */
  @ApiPropertyOptional({ enum: RoomType })
  @IsOptional()
  @IsEnum(RoomType, { message: 'roomType inválido' })
  roomType?: RoomType;

  /** Formato de proyección. */
  @ApiPropertyOptional({ enum: MovieFormat })
  @IsOptional()
  @IsEnum(MovieFormat, { message: 'format inválido' })
  format?: MovieFormat;

  /** UUID del complejo de cine. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'cinemaId debe ser un UUID válido' })
  cinemaId?: string;

  /**
   * Si es `true`, oculta funciones agotadas (RN-011).
   * Acepta `true`/`false` o `1`/`0` desde query string.
   */
  @ApiPropertyOptional({
    description: 'Filtro "Disponible": excluye funciones agotadas (RN-011)',
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

  /** Tipo de audio (opcional: subtítulo / doblaje). */
  @ApiPropertyOptional({ enum: AudioType })
  @IsOptional()
  @IsEnum(AudioType)
  audioType?: AudioType;
}
