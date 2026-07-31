import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Body de `PUT /orders/:id/reschedule` (HU-016).
 *
 * El usuario primero bloquea sillas en la nueva función con
 * `POST /functions/:newShowtimeId/seats` y envía ese `reservationId`.
 */
export class RescheduleOrderDto {
  @ApiProperty({
    format: 'uuid',
    description: 'UUID de la nueva función (misma película, futura)',
  })
  @IsUUID('4', { message: 'newShowtimeId debe ser un UUID válido' })
  newShowtimeId!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Reserva temporal de sillas en la nueva función (POST /functions/:id/seats)',
  })
  @IsUUID('4', { message: 'reservationId debe ser un UUID válido' })
  reservationId!: string;

  @ApiPropertyOptional({
    description:
      'Si es true y hay excedente, se debita de la billetera (falla si no hay saldo). ' +
      'Por defecto false: el excedente queda registrado sin bloquear el cambio.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  paySurchargeFromWallet?: boolean;
}

/**
 * Query de `GET /orders/:id/available-functions`.
 */
export class AvailableFunctionsQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Ciudad de contexto (misma regla que cartelera HU-009)',
  })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  cityId!: string;
}
