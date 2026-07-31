import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PqrsCategory } from '../enums/pqrs.enums';

/**
 * Metadatos de un adjunto al crear / actualizar PQRS.
 * Solo URL: el binario lo sube el frontend a CDN/storage.
 */
export class PqrsAttachmentInputDto {
  @ApiProperty({ example: 'boleta-borrosa.jpg' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({
    example: 'https://cdn.example.com/pqrs/boleta-borrosa.jpg',
    description: 'URL pública o firmada del archivo',
  })
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  url!: string;
}

/**
 * Body de `POST /pqrs` — alta de caso (HU-028).
 */
export class CreatePqrsDto {
  @ApiProperty({
    enum: PqrsCategory,
    example: PqrsCategory.COMPLAINT,
    description: 'Petición / Queja / Reclamo / Sugerencia / Felicitación',
  })
  @IsEnum(PqrsCategory)
  category!: PqrsCategory;

  @ApiProperty({ example: 'Silla rota en sala VIP', maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({
    example: 'La silla F12 de la sala VIP no reclinaba y el respaldo estaba flojo.',
    maxLength: 4000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Orden relacionada (opcional)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Complejo relacionado (opcional)',
    example: 'c1i2n3e4-...',
  })
  @IsOptional()
  @IsUUID()
  cinemaId?: string;

  @ApiPropertyOptional({
    type: [PqrsAttachmentInputDto],
    description: 'Adjuntos iniciales (máx. 5)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PqrsAttachmentInputDto)
  attachments?: PqrsAttachmentInputDto[];
}
