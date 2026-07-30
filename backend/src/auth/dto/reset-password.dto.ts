import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.decorator';
import { MatchField } from '../validators/match-field.decorator';

/**
 * Cuerpo de `POST /auth/reset-password` (HU-007).
 *
 * Aplica una nueva contraseña con el token del correo de recuperación.
 */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo (forgot-password)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token!: string;

  @ApiProperty({
    minLength: 10,
    example: 'NuevaSegura123!',
    description: 'Misma política RN-022 / RN-023',
  })
  @IsString()
  @MinLength(10, {
    message: 'La contraseña debe tener mínimo 10 caracteres (RN-022)',
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'NuevaSegura123!' })
  @IsString()
  @MatchField('password', {
    message: 'passwordConfirm debe coincidir con password',
  })
  passwordConfirm!: string;
}
