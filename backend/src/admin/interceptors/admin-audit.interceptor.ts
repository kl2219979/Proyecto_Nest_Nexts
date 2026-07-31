import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '../../auth/jwt/jwt.strategy';
import { AdminAuditService } from '../services/admin-audit.service';

/**
 * Interceptor que audita toda petición al backoffice (HU-020 / RN-087 / RN-090).
 *
 * @remarks
 * **Patrón:** Interceptor (Nest / AOP).
 * Problema que resuelve: registrar usuario, IP, ruta y acción sin
 * contaminar cada método del controller.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  /**
   * @param auditService - Persistencia de `admin_audit_logs`.
   */
  constructor(private readonly auditService: AdminAuditService) {}

  /**
   * @param context - Request HTTP.
   * @param next - Handler del controller.
   * @returns Observable de la respuesta.
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
      user?: AuthUser;
    }>();

    const path = req.originalUrl ?? req.url;
    const resource = this.resolveResource(path);
    const action = this.resolveAction(req.method);
    const resourceId = req.params?.id ?? null;
    const user = req.user;

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse<{ statusCode?: number }>();
          void this.auditService.record({
            userId: user?.userId ?? null,
            userEmail: user?.email ?? null,
            userRole: user?.role ?? null,
            method: req.method,
            path,
            resource,
            action,
            resourceId,
            ipAddress: this.clientIp(req),
            userAgent: this.header(req, 'user-agent')?.slice(0, 512) ?? null,
            statusCode: res.statusCode ?? null,
            payloadSummary: this.summarizeBody(req.method, req.body),
          });
        },
        error: (err: { status?: number }) => {
          void this.auditService.record({
            userId: user?.userId ?? null,
            userEmail: user?.email ?? null,
            userRole: user?.role ?? null,
            method: req.method,
            path,
            resource,
            action,
            resourceId,
            ipAddress: this.clientIp(req),
            userAgent: this.header(req, 'user-agent')?.slice(0, 512) ?? null,
            statusCode: err.status ?? 500,
            payloadSummary: this.summarizeBody(req.method, req.body),
          });
        },
      }),
    );
  }

  /**
   * Extrae el segmento de recurso tras `/api/admin/`.
   *
   * @param path - URL completa o relativa.
   * @returns Nombre lógico del recurso.
   */
  private resolveResource(path: string): string {
    const match = /\/api\/admin\/([^/?]+)/.exec(path);
    return match?.[1] ?? 'admin';
  }

  /**
   * Mapea verbo HTTP a acción de auditoría.
   *
   * @param method - Verbo HTTP.
   * @returns Acción legible.
   */
  private resolveAction(method: string): string {
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

  /**
   * Resume el body sin datos sensibles (passwords).
   *
   * @param method - Verbo.
   * @param body - Body parseado.
   * @returns JSON truncado o null.
   */
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
          if (/password|token|secret/i.test(key)) {
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

  /**
   * @param req - Request Express-like.
   * @returns IP del cliente.
   */
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

  /**
   * @param req - Request.
   * @param name - Nombre del header.
   * @returns Valor string o undefined.
   */
  private header(
    req: { headers: Record<string, string | string[] | undefined> },
    name: string,
  ): string | undefined {
    const raw = req.headers[name];
    return Array.isArray(raw) ? raw[0] : raw;
  }
}
