import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Cuerpo de `POST /auth/logout` (HU-007).
 *
 * Revoca el refresh token indicado (RN-030 / cierre de sesión).
 */
export class LogoutDto {
  @ApiProperty({ description: 'Refresh token a invalidar' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
