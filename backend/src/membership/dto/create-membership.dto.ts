import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Cuerpo de `POST /membership/create` (HU-006).
 *
 * En el flujo normal el registro ya crea la membresía (RN-025).
 * Este endpoint permite crearla de forma explícita para un `userId`
 * que aún no la tenga (idempotente → 409 si ya existe).
 */
export class CreateMembershipDto {
  @ApiProperty({
    description: 'UUID del usuario registrado',
    format: 'uuid',
  })
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;
}
