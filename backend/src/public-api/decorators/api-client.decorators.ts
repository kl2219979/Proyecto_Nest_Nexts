import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedApiClient } from '../dto/api-client-response';
import { ApiClientScope } from '../enums/public-api.enums';

/** Metadata key para scopes requeridos en un endpoint. */
export const API_SCOPES_KEY = 'api_client_scopes';

/**
 * Declara los scopes que el ApiClient debe poseer (RN-115).
 *
 * @param scopes - Uno o más `ApiClientScope`.
 */
export const RequireScopes = (...scopes: ApiClientScope[]) =>
  SetMetadata(API_SCOPES_KEY, scopes);

/**
 * Inyecta el `AuthenticatedApiClient` resuelto por `ApiClientAuthGuard`.
 */
export const CurrentApiClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedApiClient => {
    const req = ctx.switchToHttp().getRequest<{
      apiClient?: AuthenticatedApiClient;
    }>();
    return req.apiClient as AuthenticatedApiClient;
  },
);
