import { ApiClientScope } from '../enums/public-api.enums';

/**
 * Vista segura de un ApiClient (sin hashes).
 */
export type ApiClientView = {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  scopes: ApiClientScope[];
  rateLimitPerMinute: number;
  isActive: boolean;
  hasApiKey: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Respuesta de alta/rotación: incluye secretos en claro **una sola vez**.
 */
export type ApiClientCreatedResponse = ApiClientView & {
  clientSecret: string;
  apiKey: string;
  message: string;
};

/**
 * Token OAuth 2.0 client_credentials.
 */
export type OAuthTokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
};

/**
 * Cliente autenticado inyectado en `req.apiClient` tras el guard.
 */
export type AuthenticatedApiClient = {
  id: string;
  clientId: string;
  name: string;
  scopes: ApiClientScope[];
  rateLimitPerMinute: number;
  authMethod: 'api_key' | 'oauth_client';
};
