import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Query de `GET /movies/upcoming` (HU-005).
 *
 * La ciudad es obligatoria porque la fecha de estreno puede variar (RN-018).
 */
export class UpcomingQueryDto {
  /**
   * Ciudad del visitante (contexto HU-002).
   *
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  @ApiProperty({
    description: 'UUID de la ciudad (fechas de estreno por ciudad)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  cityId!: string;
}
