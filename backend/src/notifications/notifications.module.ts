import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { UpcomingNotification } from './entities/upcoming-notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Módulo de avisos de próximos estrenos (HU-005).
 *
 * Expone `POST /notifications/upcoming` y el disparo interno RN-020
 * vía `NotificationsService.dispatchUpcomingForMovie`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UpcomingNotification, Movie, City])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
