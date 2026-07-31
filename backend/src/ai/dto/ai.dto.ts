import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Preferencias opcionales capturadas por el widget (preguntas guiadas).
 */
export class ChatPreferencesDto {
  @ApiPropertyOptional({ example: 'comedia' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  genre?: string;

  @ApiPropertyOptional({ example: true, description: '¿Vienes con niños?' })
  @IsOptional()
  @IsBoolean()
  withKids?: boolean;

  @ApiPropertyOptional({
    example: 'family',
    description: 'family | date | friends | alone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  companionType?: string;

  @ApiPropertyOptional({ example: 'relajado' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  mood?: string;

  @ApiPropertyOptional({
    example: 'short',
    description: 'short (&lt;100 min) | long (&gt;=100 min)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  durationPreference?: string;

  @ApiPropertyOptional({
    example: 'DUBBED',
    description: 'DUBBED | SUBTITLED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  audioType?: string;
}

/**
 * Body de `POST /ai/chat` (HU-021).
 */
export class ChatRequestDto {
  @ApiPropertyOptional({
    description: 'Continuar sesión existente; si se omite se crea una nueva',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiProperty({
    example: '¿Qué películas hay hoy para ver con niños?',
    description: 'Mensaje en lenguaje natural',
  })
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiProperty({
    description: 'Ciudad de cartelera (RN-091)',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  cityId!: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Edad del usuario o del acompañante más joven (RN-093)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ type: ChatPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatPreferencesDto)
  preferences?: ChatPreferencesDto;
}

/**
 * Body de `POST /ai/history` (HU-021).
 */
export class ChatHistoryRequestDto {
  @ApiProperty({ description: 'UUID de la sesión a consultar' })
  @IsUUID('4')
  sessionId!: string;
}
