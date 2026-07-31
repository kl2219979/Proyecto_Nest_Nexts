import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, roleSatisfies } from '../enums/user.enums';
import type { AuthUser } from '../jwt/jwt.strategy';

/**
 * Guard RBAC (HU-020 / RN-088 / RN-089).
 *
 * Lee `@Roles(minimum)` y comprueba que `req.user.role` alcance ese mínimo
 * según la jerarquía SUPER_ADMIN > ADMIN > STAFF > CUSTOMER.
 *
 * Debe usarse **después** de `JwtAuthGuard` (necesita `req.user`).
 *
 * @remarks
 * **Patrón:** Guard (Nest) + metadata Reflection.
 * Problema que resuelve: centralizar autorización por rol sin
 * repetir `if` en cada controller.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * @param reflector - Lee metadata de `@Roles`.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * @param context - Contexto HTTP Nest.
   * @returns `true` si el rol alcanza el mínimo.
   * @throws {ForbiddenException} Sin rol o insuficiente (RN-089).
   */
  canActivate(context: ExecutionContext): boolean {
    const minimum = this.reflector.getAllAndOverride<UserRole | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!minimum) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user?.role) {
      throw new ForbiddenException('Rol de acceso no disponible en la sesión');
    }

    if (!roleSatisfies(user.role, minimum)) {
      throw new ForbiddenException(
        `Se requiere rol ${minimum} o superior (RN-088)`,
      );
    }

    return true;
  }
}
