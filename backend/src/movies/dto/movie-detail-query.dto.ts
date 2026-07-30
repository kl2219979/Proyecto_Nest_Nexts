import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Query de detalle / recomendaciones (HU-004).
 *
 * `cityId` es obligatorio: las funciones y precios deben
 * corresponder a la ciudad seleccionada (criterio de aceptación).
 */
export class MovieDetailQueryDto {
  /**
   * Ciudad del visitante (contexto HU-002).
   *
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  @ApiProperty({
    description: 'UUID de la ciudad para filtrar funciones futuras',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  cityId!: string;
}
