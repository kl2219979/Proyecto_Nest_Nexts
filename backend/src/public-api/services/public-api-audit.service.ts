import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicApiAuditLog } from '../entities/public-api-audit-log.entity';

/** Entrada para persistir un evento de auditoría pública. */
export type PublicApiAuditInput = {
  apiClientId: string | null;
  apiClientPublicId: string | null;
  apiClientName: string | null;
  userId?: string | null;
  method: string;
  path: string;
  resource: string;
  action: string;
  resourceId?: string | null;
  authMethod?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  payloadSummary?: string | null;
};

/**
 * Persistencia de auditoría de la API pública (HU-029 / RN-117).
 */
@Injectable()
export class PublicApiAuditService {
  private readonly logger = new Logger(PublicApiAuditService.name);

  /**
   * @param auditRepo - Tabla `public_api_audit_logs`.
   */
  constructor(
    @InjectRepository(PublicApiAuditLog)
    private readonly auditRepo: Repository<PublicApiAuditLog>,
  ) {}

  /**
   * Guarda un evento. Fallos de escritura no rompen la petición HTTP.
   *
   * @param input - Datos del evento.
   */
  async record(input: PublicApiAuditInput): Promise<void> {
    try {
      await this.auditRepo.save(this.auditRepo.create(input));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudo auditar API pública: ${msg}`);
    }
  }

  /**
   * Lista eventos recientes (ADMIN / monitoreo).
   *
   * @param limit - Máximo de filas.
   * @param apiClientId - Filtro opcional.
   */
  async list(
    limit = 100,
    apiClientId?: string,
  ): Promise<PublicApiAuditLog[]> {
    const take = Math.min(Math.max(limit, 1), 500);
    return this.auditRepo.find({
      where: apiClientId ? { apiClientId } : {},
      order: { createdAt: 'DESC' },
      take,
    });
  }
}
