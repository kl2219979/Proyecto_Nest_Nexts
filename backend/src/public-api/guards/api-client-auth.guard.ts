import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedApiClient } from '../dto/api-client-response';
import { ApiClientsService } from '../services/api-clients.service';

type RequestWithClient = {
  headers: Record<string, string | string[] | undefined>;
  apiClient?: AuthenticatedApiClient;
};

/**
 * Autentica consumidores externos (HU-029).
 *
 * Orden de resolución:
 * 1. Header `X-API-Key`
 * 2. Header `X-Client-Token` (Bearer OAuth client)
 * 3. `Authorization: Bearer` solo si el JWT tiene `tokenUse: api_client`
 *    (así no choca con el JWT de usuario final en rutas duales)
 *
 * @remarks
 * **Patrón:** Guard (Nest).
 * Problema que resuelve: identificar la app externa sin reescribir
 * los controllers de dominio.
 */
@Injectable()
export class ApiClientAuthGuard implements CanActivate {
  /**
   * @param clients - Validación de key / token OAuth.
   */
  constructor(private readonly clients: ApiClientsService) {}

  /**
   * @param context - Request HTTP.
   * @returns true si hay cliente válido.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithClient>();
    const apiKey = this.header(req, 'x-api-key');
    if (apiKey) {
      req.apiClient = await this.clients.authenticateByApiKey(apiKey);
      return true;
    }

    const clientTokenHeader = this.header(req, 'x-client-token');
    if (clientTokenHeader) {
      const token = this.stripBearer(clientTokenHeader);
      req.apiClient = await this.clients.authenticateByClientToken(token);
      return true;
    }

    const authorization = this.header(req, 'authorization');
    if (authorization?.toLowerCase().startsWith('bearer ')) {
      const token = authorization.slice(7).trim();
      try {
        req.apiClient = await this.clients.authenticateByClientToken(token);
        return true;
      } catch {
        /**
         * Puede ser JWT de usuario: no fallar aquí;
         * las rutas duales usarán JwtAuthGuard aparte.
         * Pero sin X-API-Key el cliente externo no está identificado.
         */
      }
    }

    throw new UnauthorizedException(
      'Se requiere X-API-Key o token OAuth de cliente (HU-029)',
    );
  }

  private header(
    req: RequestWithClient,
    name: string,
  ): string | undefined {
    const raw = req.headers[name];
    return Array.isArray(raw) ? raw[0] : raw;
  }

  private stripBearer(value: string): string {
    return value.toLowerCase().startsWith('bearer ')
      ? value.slice(7).trim()
      : value.trim();
  }
}
