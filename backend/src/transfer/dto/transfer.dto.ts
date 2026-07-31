import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DocumentType } from '../../auth/enums/user.enums';

/**
 * Cuerpo de `POST /tickets/transfer` (HU-017).
 *
 * Cesión de una o varias entradas a otro asistente (email + documento).
 */
export class TransferTicketsDto {
  @ApiProperty({
    type: [String],
    description: 'UUIDs de entradas propias VALID a ceder',
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ticketIds!: string[];

  @ApiProperty({
    description: 'Nombre completo del nuevo asistente',
    example: 'Ana Pérez',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(220)
  recipientName!: string;

  @ApiProperty({
    description: 'Correo del destinatario (cuenta existente o invitación)',
    example: 'ana@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  recipientEmail!: string;

  @ApiProperty({
    enum: DocumentType,
    description: 'Tipo de documento del destinatario',
    example: DocumentType.CC,
  })
  @IsEnum(DocumentType)
  recipientDocumentType!: DocumentType;

  @ApiProperty({
    description: 'Número de documento del destinatario',
    example: '1020304050',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  recipientDocumentNumber!: string;
}

/**
 * Cuerpo de `POST /tickets/transfer/accept` (HU-017 / RN-073).
 *
 * Basta con `transferId` o `acceptToken` (enlace del correo).
 */
export class AcceptTransferDto {
  @ApiPropertyOptional({
    description: 'UUID de la transferencia pendiente',
  })
  @ValidateIf((o: AcceptTransferDto) => !o.acceptToken)
  @IsUUID('4')
  transferId?: string;

  @ApiPropertyOptional({
    description: 'Token opaco del correo de cesión',
  })
  @ValidateIf((o: AcceptTransferDto) => !o.transferId)
  @IsString()
  @MinLength(16)
  @MaxLength(64)
  acceptToken?: string;

  @ApiPropertyOptional({
    description: 'Reservado; no usado (compatibilidad Swagger)',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
