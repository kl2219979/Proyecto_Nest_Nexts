import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

/**
 * Cuerpo de `POST /auth/forgot-password` (HU-007).
 *
 * Siempre responde OK genérico (no revela si el email existe).
 */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana.garcia@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
