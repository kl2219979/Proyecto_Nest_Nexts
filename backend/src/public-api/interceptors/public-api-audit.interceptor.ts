import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '../../auth/jwt/jwt.strategy';
import type { AuthenticatedApiClient } from '../dto/api-client-response';
import { PublicApiAuditService } from '../services/public-api-audit.service';

/**
 * Auditoría de la API pública (HU-029 / RN-117).
 *
 * @remarks
 * **Patrón:** Interceptor (Nest / AOP).
 * Problema que resuelve: registrar cliente, ruta y status sin
 * contaminar cada método del facade.
 */
@Injectable()
export class PublicApiAuditInterceptor implements NestInterceptor {
  /**
   * @param auditService - Persistencia de `public_api_audit_logs`.
   */
  constructor(private readonly auditService: PublicApiAuditService) {}

  /**
   * @param context - Request HTTP.
   * @param next - Handler.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      params?: Record<string, string>;
      body?: unknown;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      apiClient?: AuthenticatedApiClient;
      user?: AuthUser;
    }>();

    const path = req.originalUrl ?? req.url;
    const resource = this.resolveResource(path);
    const action = this.resolveAction(req.method, path);
    const resourceId = req.params?.id ?? req.params?.code ?? null;
    const client = req.apiClient;
    const user = req.user;

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse<{ statusCode?: number }>();
          void this.auditService.record({
            apiClientId: client?.id ?? null,
            apiClientPublicId: client?.clientId ?? null,
            apiClientName: client?.name ?? null,
            userId: user?.userId ?? null,
            method: req.method,
            path,
            resource,
            action,
            resourceId,
            authMethod: client?.authMethod ?? null,
            ipAddress: this.clientIp(req),
            userAgent: this.header(req, 'user-agent')?.slice(0, 512) ?? null,
            statusCode: res.statusCode ?? null,
            payloadSummary: this.summarizeBody(req.method, req.body),
          });
        },
        error: (err: { status?: number }) => {
          void this.auditService.record({
            apiClientId: client?.id ?? null,
            apiClientPublicId: client?.clientId ?? null,
            apiClientName: client?.name ?? null,
            userId: user?.userId ?? null,
            method: req.method,
            path,
            resource,
            action,
            resourceId,
            authMethod: client?.authMethod ?? null,
            ipAddress: this.clientIp(req),
            userAgent: this.header(req, 'user-agent')?.slice(0, 512) ?? null,
            statusCode: err.status ?? 500,
            payloadSummary: this.summarizeBody(req.method, req.body),
          });
        },
      }),
    );
  }

  private resolveResource(path: string): string {
    const match = /\/api\/v1\/public\/([^/?]+)/.exec(path);
    if (match?.[1]) return match[1];
    if (path.includes('/oauth/')) return 'oauth';
    return 'public';
  }

  private resolveAction(method: string, path: string): string {
    if (path.includes('/oauth/token')) return 'TOKEN';
    switch (method.toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      case 'GET':
        return 'READ';
      default:
        return method.toUpperCase();
    }
  }

  private summarizeBody(method: string, body: unknown): string | null {
    if (method === 'GET' || method === 'DELETE' || body == null) {
      return null;
    }
    try {
      const clone =
        typeof body === 'object' && body !== null
          ? { ...(body as Record<string, unknown>) }
          : body;
      if (typeof clone === 'object' && clone !== null) {
        for (const key of Object.keys(clone)) {
          if (/password|token|secret|api.?key/i.test(key)) {
            (clone as Record<string, unknown>)[key] = '[redacted]';
          }
        }
      }
      const json = JSON.stringify(clone);
      return json.length > 2000 ? `${json.slice(0, 2000)}…` : json;
    } catch {
      return null;
    }
  }

  private clientIp(req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  }): string | null {
    const forwarded = this.header(req, 'x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0]?.trim() ?? null;
    }
    return req.ip ?? null;
  }

  private header(
    req: { headers: Record<string, string | string[] | undefined> },
    name: string,
  ): string | undefined {
    const raw = req.headers[name];
    return Array.isArray(raw) ? raw[0] : raw;
  }
}
