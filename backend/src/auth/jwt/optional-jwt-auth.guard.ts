import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT opcional (HU-010 mapa de sillas).
 *
 * Si no hay Bearer token, deja pasar sin `req.user`.
 * Si hay token inválido, también deja pasar (mapa público);
 * solo marca SELECTED / mySelection cuando el JWT es válido.
 *
 * @remarks
 * **Patrón Strategy (Passport):** reutiliza la estrategia `jwt` sin
 * forzar autenticación en rutas de lectura pública.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Permite la ruta aunque no exista Authorization.
   *
   * @param context - Contexto HTTP de Nest.
   * @returns {boolean | Promise<boolean>} Siempre true si no hay token.
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return true;
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  /**
   * No lanza 401: token malo → usuario anónimo.
   *
   * @param _err - Error de Passport (ignorado).
   * @param user - Usuario validado o false.
   * @returns Usuario o null.
   */
  handleRequest<TUser>(_err: Error | null, user: TUser): TUser | null {
    return user ?? null;
  }
}
