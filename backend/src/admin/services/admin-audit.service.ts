import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';

/** Entrada para persistir un evento de auditoría. */
export type AdminAuditInput = {
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  method: string;
  path: string;
  resource: string;
  action: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  payloadSummary?: string | null;
};

/**
 * Persistencia de auditoría del panel admin (HU-020 / RN-087 / RN-090).
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  /**
   * @param auditRepo - Tabla `admin_audit_logs`.
   */
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  /**
   * Guarda un evento. Fallos de escritura no rompen la petición HTTP.
   *
   * @param input - Datos del evento.
   */
  async record(input: AdminAuditInput): Promise<void> {
    try {
      await this.auditRepo.save(this.auditRepo.create(input));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudo auditar operación admin: ${msg}`);
    }
  }

  /**
   * Lista eventos recientes (consulta de seguridad).
   *
   * @param limit - Máximo de filas (default 100).
   * @param resource - Filtro opcional por recurso.
   * @returns Eventos ordenados del más reciente al más antiguo.
   */
  async list(
    limit = 100,
    resource?: string,
  ): Promise<AdminAuditLog[]> {
    const take = Math.min(Math.max(limit, 1), 500);
    return this.auditRepo.find({
      where: resource ? { resource } : {},
      order: { createdAt: 'DESC' },
      take,
    });
  }
}
