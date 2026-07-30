import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Sub-DTO de preferencias de notificación en `PUT /profile` (HU-008).
 */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Correos transaccionales' })
  @IsOptional()
  @IsBoolean()
  emailTransactional?: boolean;

  @ApiPropertyOptional({ description: 'Marketing / promociones' })
  @IsOptional()
  @IsBoolean()
  emailMarketing?: boolean;

  @ApiPropertyOptional({ description: 'Avisos de próximos estrenos' })
  @IsOptional()
  @IsBoolean()
  emailUpcoming?: boolean;
}
