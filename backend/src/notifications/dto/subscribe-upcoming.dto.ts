import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Body de `POST /notifications/upcoming` (HU-005).
 *
 * Sin JWT (HU-007): `userId` + `email` viajan en el body de forma provisional.
 */
export class SubscribeUpcomingDto {
  /**
   * UUID del usuario que solicita el aviso.
   *
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  @ApiProperty({
    description: 'UUID del usuario (provisional hasta auth JWT)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'userId debe ser un UUID válido' })
  @IsNotEmpty()
  userId!: string;

  /**
   * Correo de destino del aviso de estreno.
   *
   * @example "usuario@ejemplo.com"
   */
  @ApiProperty({
    description: 'Email donde se enviará el aviso (HU-015)',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'email debe ser un correo válido' })
  @IsNotEmpty()
  email!: string;

  /** Película en estado próximo estreno. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'movieId debe ser un UUID válido' })
  @IsNotEmpty()
  movieId!: string;

  /** Ciudad de contexto del visitante. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'cityId debe ser un UUID válido' })
  @IsNotEmpty()
  cityId!: string;
}
