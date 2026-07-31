import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PqrsStatus } from '../enums/pqrs.enums';
import { PqrsAttachmentInputDto } from './create-pqrs.dto';

/**
 * Body de `PUT /pqrs/:id` — seguimiento / gestión (HU-028).
 *
 * Cliente: comentario y/o adjuntos.
 * STAFF+: además `status`, `assignedToUserId`, comentario interno.
 */
export class UpdatePqrsDto {
  @ApiPropertyOptional({
    enum: PqrsStatus,
    description: 'Nuevo estado (solo STAFF+)',
  })
  @IsOptional()
  @IsEnum(PqrsStatus)
  status?: PqrsStatus;

  @ApiPropertyOptional({
    description:
      'UUID del colaborador asignado (solo STAFF+). `null` desasigna.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assignedToUserId?: string | null;

  @ApiPropertyOptional({
    description: 'Nuevo comentario público (cliente o staff)',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Si true, el comentario es interno (solo STAFF+)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  commentInternal?: boolean;

  @ApiPropertyOptional({
    type: [PqrsAttachmentInputDto],
    description: 'Adjuntos adicionales (máx. 5 por request)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PqrsAttachmentInputDto)
  attachments?: PqrsAttachmentInputDto[];
}
