import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Promotion } from '../promotions/entities/promotion.entity';
import { CineflashController } from './cineflash.controller';
import { CineflashJob } from './cineflash.job';
import { CineflashService } from './cineflash.service';
import { CineFlashAudit } from './entities/cineflash-audit.entity';

/**
 * Cine Flash — promoción inteligente automática (HU-019).
 *
 * - Cron cada 5 min + `POST /cineflash/process` (ADMIN)
 * - Listado: `GET /movies/cineflash` (vía MoviesController)
 * - RN-080…086: 1 h, ocupación &lt; 60%, 20% OFF entradas, máx. 3, no apilable,
 *   apagado automático, auditoría, email + push stub
 *
 * Exporta `CineflashService` para cartelera y carrito.
 */
@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      Showtime,
      Promotion,
      CineFlashAudit,
      User,
      UserProfile,
      NotificationPreference,
    ]),
  ],
  controllers: [CineflashController],
  providers: [CineflashService, CineflashJob],
  exports: [CineflashService],
})
export class CineflashModule {}
