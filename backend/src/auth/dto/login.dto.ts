import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo de `POST /auth/login` (HU-007).
 */
export class LoginDto {
  @ApiProperty({ example: 'ana.garcia@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Segura123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

/**
 * Contexto de red/dispositivo para auditoría (no viene del body JSON;
 * el controller lo rellena desde headers).
 */
export type ClientContext = {
  ipAddress: string | null;
  userAgent: string | null;
};
