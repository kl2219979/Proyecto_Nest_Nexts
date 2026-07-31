import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { EmailTemplate } from '../enums/email-notification.enums';

/**
 * Cuerpo de `POST /notifications/email` (HU-015).
 *
 * Permite encolar un correo para el usuario autenticado (demo / reenvío).
 * Los envíos automáticos de negocio no pasan por este endpoint.
 */
export class SendEmailDto {
  @ApiProperty({
    enum: EmailTemplate,
    description: 'Plantilla corporativa a renderizar',
    example: EmailTemplate.PROFILE_UPDATED,
  })
  @IsEnum(EmailTemplate)
  template!: EmailTemplate;

  @ApiPropertyOptional({
    description: 'Destinatario (por defecto el email del JWT)',
  })
  @IsOptional()
  @IsEmail()
  toEmail?: string;

  @ApiPropertyOptional({
    description: 'Variables de plantilla (nombre, links, etc.)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Tipo de entidad relacionada' })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'UUID de entidad relacionada' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;
}
