import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Body de `POST /surveys` — respuesta de satisfacción post-visita (HU-027).
 *
 * Aspectos 1–5 · `recommendScore` 0–10 · `orderId` de la compra asistida.
 */
export class CreateSurveyDto {
  @ApiProperty({
    description: 'UUID de la orden PAID sobre la que se encuestó (RN-109)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ description: 'Calificación película (1–5)', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  movieRating!: number;

  @ApiProperty({ description: 'Calificación sala (1–5)', example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  roomRating!: number;

  @ApiProperty({ description: 'Sonido (1–5)', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  soundRating!: number;

  @ApiProperty({ description: 'Imagen (1–5)', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  imageRating!: number;

  @ApiProperty({ description: 'Comodidad (1–5)', example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  comfortRating!: number;

  @ApiProperty({ description: 'Confitería (1–5)', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  snacksRating!: number;

  @ApiProperty({ description: 'Limpieza (1–5)', example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  cleanlinessRating!: number;

  @ApiProperty({ description: 'Servicio (1–5)', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating!: number;

  @ApiProperty({
    description: 'Probabilidad de recomendar (0–10, estilo NPS)',
    example: 9,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  recommendScore!: number;

  @ApiPropertyOptional({
    description: 'Comentarios libres (máx. 1000 caracteres)',
    example: 'Excelente experiencia; la sala VIP valió la pena.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}
