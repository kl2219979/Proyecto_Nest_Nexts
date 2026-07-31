import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { MembershipModule } from '../membership/membership.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TransferModule } from '../transfer/transfer.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha/captcha.service';
import { LoginAudit } from './entities/login-audit.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { JwtStrategy } from './jwt/jwt.strategy';
import { OptionalJwtAuthGuard } from './jwt/optional-jwt-auth.guard';

/**
 * Módulo de autenticación (HU-006 registro + HU-007 sesión JWT + HU-020 RBAC).
 *
 * Exporta `JwtAuthGuard` / `RolesGuard` / `AuthService` para rutas protegidas.
 * Importa `TransferModule` (forwardRef) para enlazar cesiones tras activar (HU-017).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      NotificationPreference,
      RefreshToken,
      LoginAudit,
      City,
      Cinema,
    ]),
    forwardRef(() => MembershipModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => TransferModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    /**
     * JwtModule asíncrono: lee `JWT_SECRET` del entorno.
     * `expiresIn` por defecto = 15 min (RN-028); el service puede override.
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      /**
       * @param config - ConfigService global.
       * @returns Opciones de firma JWT.
       */
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-jwt-secret-change-me'),
        signOptions: {
          expiresIn: 15 * 60,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    CaptchaService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
