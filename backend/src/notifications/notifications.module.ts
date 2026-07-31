import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Order } from '../payments/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { EmailGatewayService } from './email-gateway.service';
import { EmailService } from './email.service';
import { EmailNotification } from './entities/email-notification.entity';
import { UpcomingNotification } from './entities/upcoming-notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ShowtimeReminderJob } from './showtime-reminder.job';

/**
 * Notificaciones: estrenos (HU-005) + motor de correo (HU-015).
 *
 * Expone:
 * - `POST /notifications/upcoming`
 * - `GET/POST /notifications/email`
 * - `GET/PUT/POST /notifications/preferences`
 *
 * Exporta `EmailService` / `NotificationsService` para Auth, Profile, Payments.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UpcomingNotification,
      EmailNotification,
      NotificationPreference,
      User,
      UserProfile,
      Movie,
      City,
      Ticket,
      Order,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    EmailGatewayService,
    ShowtimeReminderJob,
  ],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
