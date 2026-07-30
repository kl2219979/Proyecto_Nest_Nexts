import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Body de `POST /functions/:id/seats` — bloqueo temporal (HU-010 / RN-039).
 */
export class LockSeatsDto {
  /**
   * UUIDs de sillas a bloquear.
   * Reemplaza la selección previa del mismo usuario en esta función.
   */
  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes seleccionar al menos una silla' })
  @ArrayMaxSize(20, { message: 'Demasiadas sillas en una sola petición' })
  @ArrayUnique({ message: 'Hay sillas duplicadas en la selección' })
  @IsUUID('4', { each: true, message: 'Cada seatId debe ser UUID' })
  seatIds!: string[];

  /**
   * RN-042: obligatorio `true` si la selección incluye sillas PREFERENTIAL.
   */
  @ApiPropertyOptional({
    description:
      'Confirma política de movilidad reducida (RN-042) al elegir PREFERENTIAL',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  acknowledgePreferential?: boolean;
}

/**
 * Body de `DELETE /reservations/release-seats` (HU-010 / RN-040).
 */
export class ReleaseSeatsDto {
  /**
   * Libera un grupo concreto. Si se omite, libera todos los locks
   * temporales activos del usuario.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'reservationId debe ser UUID' })
  reservationId?: string;
}
