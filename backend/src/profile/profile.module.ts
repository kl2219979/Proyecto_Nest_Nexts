import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

/**
 * Módulo de perfil de usuario (HU-008).
 *
 * Expone `GET /profile` y `PUT /profile` protegidos con JWT.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      NotificationPreference,
      City,
      Cinema,
    ]),
    AuthModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
