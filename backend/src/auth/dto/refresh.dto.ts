import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Cuerpo de `POST /auth/refresh` (HU-007).
 *
 * Renueva el Access Token sin volver a pedir email/password.
 */
export class RefreshDto {
  @ApiProperty({ description: 'Refresh token opaco emitido en el login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
