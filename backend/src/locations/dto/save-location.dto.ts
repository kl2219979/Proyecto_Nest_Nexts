import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Cuerpo de `POST /users/location` (HU-002).
 *
 * El visitante (frontend) envía la ciudad elegida; la API valida
 * que exista, esté activa y tenga cines activos (RN-006).
 */
export class SaveLocationDto {
  /**
   * UUID de la ciudad seleccionada en el asistente geográfico.
   *
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  @ApiProperty({
    description: 'UUID de la ciudad elegida por el visitante',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'cityId es obligatorio' })
  cityId!: string;
}
