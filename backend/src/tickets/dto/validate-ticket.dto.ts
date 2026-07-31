import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body de `POST /tickets/validate` (HU-024).
 *
 * El lector QR envía el payload opaco leído del código
 * (mismo valor que `ticket.qr.payload` / `MCQR-…`).
 */
export class ValidateTicketDto {
  @ApiProperty({
    example: 'MCQR-a1b2c3d4e5f6789012345678abcdef01',
    description: 'Payload del código QR escaneado en puerta.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  qrPayload!: string;
}
