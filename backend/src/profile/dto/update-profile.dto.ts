import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../auth/enums/user.enums';
import { MatchField } from '../../auth/validators/match-field.decorator';
import { UpdateNotificationPreferencesDto } from './update-notification-preferences.dto';

/**
 * Cuerpo de `PUT /profile` (HU-008).
 *
 * Todos los campos son opcionales: solo se actualiza lo enviado.
 * Si cambia `email`, RN-034 exige re-verificación (emailConfirm obligatorio).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'García López' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento ISO (YYYY-MM-DD)',
    example: '1995-04-12',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Ciudad principal (contexto cartelera)' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Complejo favorito; `null` lo limpia',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  favoriteCinemaId?: string | null;

  @ApiPropertyOptional({
    description: 'URL de fotografía (opcional); `null` la limpia',
    nullable: true,
    example: 'https://cdn.example.com/avatars/ana.jpg',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  photoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nuevo correo (RN-034: requiere re-activación)',
    example: 'ana.nueva@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Confirmación del nuevo correo (obligatoria si envía email)',
    example: 'ana.nueva@example.com',
  })
  @ValidateIf((o: UpdateProfileDto) => o.email !== undefined)
  @IsEmail()
  @MatchField('email', {
    message: 'emailConfirm debe coincidir con email',
  })
  emailConfirm?: string;

  @ApiPropertyOptional({ type: UpdateNotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNotificationPreferencesDto)
  notificationPreferences?: UpdateNotificationPreferencesDto;
}
