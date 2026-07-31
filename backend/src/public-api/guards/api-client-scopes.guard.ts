import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_SCOPES_KEY } from '../decorators/api-client.decorators';
import type { AuthenticatedApiClient } from '../dto/api-client-response';
import { ApiClientScope } from '../enums/public-api.enums';

/**
 * Verifica scopes del ApiClient (HU-029 / RN-115).
 *
 * Debe ir **después** de `ApiClientAuthGuard`.
 */
@Injectable()
export class ApiClientScopesGuard implements CanActivate {
  /**
   * @param reflector - Lee `@RequireScopes(...)`.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * @param context - Request HTTP.
   * @returns true si el cliente tiene todos los scopes.
   */
  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<ApiClientScope[]>(API_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      apiClient?: AuthenticatedApiClient;
    }>();
    const client = req.apiClient;
    if (!client) {
      throw new ForbiddenException('Cliente API no autenticado');
    }

    const missing = required.filter((s) => !client.scopes.includes(s));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Scope insuficiente. Requiere: ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
