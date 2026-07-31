import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedApiClient } from '../dto/api-client-response';
import { ApiClientRateLimitService } from '../services/api-client-rate-limit.service';

/**
 * Aplica el rate limit por cliente (HU-029 / RN-116).
 *
 * Debe ir **después** de `ApiClientAuthGuard`.
 */
@Injectable()
export class ApiClientRateLimitGuard implements CanActivate {
  /**
   * @param rateLimit - Contador en memoria por cliente.
   */
  constructor(private readonly rateLimit: ApiClientRateLimitService) {}

  /**
   * @param context - Request HTTP.
   * @returns true si no se excedió el tope.
   */
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      apiClient?: AuthenticatedApiClient;
    }>();
    const client = req.apiClient;
    if (client) {
      this.rateLimit.consume(client.id, client.rateLimitPerMinute);
    }
    return true;
  }
}
