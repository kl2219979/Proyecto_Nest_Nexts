import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JwtPayload } from './jwt-payload';

/**
 * Usuario autenticado inyectado en `req.user` tras validar el JWT.
 */
export type AuthUser = {
  userId: string;
  email: string;
};

/**
 * Estrategia Passport JWT (HU-007).
 *
 * Extrae el Bearer token, verifica la firma y carga al usuario activo.
 *
 * @remarks
 * **Patrón Strategy:** Passport permite intercambiar mecanismos de auth
 * (JWT hoy; mañana API key HU-029) sin reescribir los controllers.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * @param configService - `JWT_SECRET`.
   * @param userRepo - Valida que el usuario siga activo.
   */
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'dev-jwt-secret-change-me',
      ),
    });
  }

  /**
   * Se ejecuta tras verificar firma/expiración del token.
   *
   * @param payload - Claims del Access JWT.
   * @returns {Promise<AuthUser>} Objeto que Nest pone en `req.user`.
   * @throws {UnauthorizedException} Usuario inexistente o inactivo.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.isEmailVerified) {
      throw new UnauthorizedException('Sesión inválida');
    }
    return { userId: user.id, email: user.email };
  }
}
