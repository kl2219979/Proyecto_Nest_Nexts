import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo de `POST /auth/activate` (HU-006 / RN-024).
 *
 * El token llega por el enlace del correo de activación (24 h).
 */
export class ActivateAccountDto {
  @ApiProperty({
    description: 'Token de activación recibido por correo',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token!: string;
}
