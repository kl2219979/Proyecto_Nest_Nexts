import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Preferencias de correo (`GET/PUT/POST /notifications/preferences`, HU-015).
 *
 * RN-062: solo marketing/upcoming son opt-in/out reales.
 * `emailTransactional` se persiste por compatibilidad con HU-008, pero
 * los correos obligatorios (compra, activación, reset…) siempre se envían.
 */
export class UpdateEmailPreferencesDto {
  @ApiPropertyOptional({
    description:
      'Preferencia informativa; no silencia correos transaccionales obligatorios (RN-062)',
  })
  @IsOptional()
  @IsBoolean()
  emailTransactional?: boolean;

  @ApiPropertyOptional({
    description: 'Comunicaciones promocionales / Cine Flash / beneficios',
  })
  @IsOptional()
  @IsBoolean()
  emailMarketing?: boolean;

  @ApiPropertyOptional({
    description: 'Avisos de próximos estrenos (HU-005)',
  })
  @IsOptional()
  @IsBoolean()
  emailUpcoming?: boolean;
}
