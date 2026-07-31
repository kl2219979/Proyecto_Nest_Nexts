import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Body de `POST /tickets/regenerate` (HU-016).
 */
export class RegenerateTicketsDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Orden PAID cuyas líneas ya fueron actualizadas',
  })
  @IsUUID('4', { message: 'orderId debe ser un UUID válido' })
  orderId!: string;
}
