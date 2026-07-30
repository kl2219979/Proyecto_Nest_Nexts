import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { MembershipModule } from '../membership/membership.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha/captcha.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';

/**
 * Módulo de registro y activación de cuentas (HU-006).
 *
 * Login JWT = HU-007 (se ampliará este módulo o uno hermano).
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
    MembershipModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, CaptchaService],
  exports: [AuthService],
})
export class AuthModule {}
