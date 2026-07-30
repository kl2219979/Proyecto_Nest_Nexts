import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DocumentType, Gender } from '../enums/user.enums';
import { IsStrongPassword } from '../validators/is-strong-password.decorator';
import { MatchField } from '../validators/match-field.decorator';

/**
 * Cuerpo de `POST /auth/register` (HU-006).
 *
 * Agrupa información personal, contacto, seguridad, preferencias
 * y consentimientos del formulario de alta.
 */
export class RegisterDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'García López' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName!: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.CC })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  documentNumber!: string;

  @ApiProperty({
    description: 'Fecha de nacimiento ISO (YYYY-MM-DD)',
    example: '1995-04-12',
  })
  @IsDateString()
  birthDate!: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ example: 'ana.garcia@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'ana.garcia@example.com' })
  @IsEmail()
  @MatchField('email', {
    message: 'emailConfirm debe coincidir con email',
  })
  emailConfirm!: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  /**
   * Contraseña en texto plano (solo en tránsito).
   * RN-022 / RN-023: mín. 10, mayúscula, minúscula, número, especial.
   */
  @ApiProperty({
    minLength: 10,
    example: 'Segura123!',
    description: 'Mín. 10 chars; mayúscula, minúscula, número y especial',
  })
  @IsString()
  @MinLength(10, {
    message: 'La contraseña debe tener mínimo 10 caracteres (RN-022)',
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'Segura123!' })
  @IsString()
  @MatchField('password', {
    message: 'passwordConfirm debe coincidir con password',
  })
  passwordConfirm!: string;

  @ApiProperty({
    description: 'Ciudad principal (UUID de locations)',
    format: 'uuid',
  })
  @IsUUID('4')
  cityId!: string;

  @ApiPropertyOptional({
    description: 'Complejo favorito (opcional)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  favoriteCinemaId?: string;

  @ApiProperty({ description: 'Aceptación tratamiento de datos' })
  @IsBoolean()
  @Equals(true, { message: 'Debe aceptar el tratamiento de datos personales' })
  acceptPrivacy!: boolean;

  @ApiProperty({ description: 'Aceptación términos y condiciones' })
  @IsBoolean()
  @Equals(true, { message: 'Debe aceptar los términos y condiciones' })
  acceptTerms!: boolean;

  @ApiPropertyOptional({
    description: 'Comunicaciones comerciales (opcional)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  acceptMarketing?: boolean;

  /**
   * Token CAPTCHA del cliente.
   * En desarrollo: usar el valor de `CAPTCHA_DEV_TOKEN` (default `dev-ok`).
   */
  @ApiProperty({
    description: 'Token CAPTCHA (en dev: valor de CAPTCHA_DEV_TOKEN)',
    example: 'dev-ok',
  })
  @IsString()
  @IsNotEmpty({ message: 'captchaToken es obligatorio' })
  captchaToken!: string;
}
