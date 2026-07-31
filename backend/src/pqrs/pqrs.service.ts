import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { roleSatisfies, UserRole } from '../auth/enums/user.enums';
import { Cinema } from '../locations/entities/cinema.entity';
import { EmailService } from '../notifications/email.service';
import { Order } from '../payments/entities/order.entity';
import { CreatePqrsDto } from './dto/create-pqrs.dto';
import {
  PqrsAttachmentView,
  PqrsCaseView,
  PqrsCommentView,
  PqrsHistoryView,
  PqrsListResponse,
  PqrsSlaConfigView,
  PqrsSlaListResponse,
} from './dto/pqrs-response';
import { UpdatePqrsDto } from './dto/update-pqrs.dto';
import { UpdatePqrsSlaDto } from './dto/update-sla.dto';
import { PqrsAttachment } from './entities/pqrs-attachment.entity';
import { PqrsCase } from './entities/pqrs-case.entity';
import { PqrsComment } from './entities/pqrs-comment.entity';
import { PqrsCounter } from './entities/pqrs-counter.entity';
import { PqrsHistory } from './entities/pqrs-history.entity';
import { PqrsSlaConfig } from './entities/pqrs-sla-config.entity';
import {
  DEFAULT_PQRS_SLA_HOURS,
  PQRS_CATEGORY_LABEL,
  PQRS_STATUS_LABEL,
  PqrsCategory,
  PqrsHistoryEvent,
  PqrsStatus,
} from './enums/pqrs.enums';

const TERMINAL: ReadonlySet<PqrsStatus> = new Set([
  PqrsStatus.RESOLVED,
  PqrsStatus.CLOSED,
  PqrsStatus.CANCELLED,
]);

/**
 * Servicio PQRS (HU-028).
 *
 * Responsabilidades (SRP):
 * 1. Alta de casos con consecutivo (RN-110) y SLA (RN-111).
 * 2. Seguimiento: listado, detalle, comentarios, adjuntos, historial.
 * 3. Asignación interna y cambios de estado (STAFF+).
 * 4. Notificaciones automáticas por correo (RN-112).
 *
 * Capas: Controller → Service → Repository (TypeORM).
 */
@Injectable()
export class PqrsService {
  /**
   * @param dataSource - Transacciones (consecutivo + caso).
   * @param caseRepo - Casos PQRS.
   * @param commentRepo - Comentarios.
   * @param attachmentRepo - Adjuntos (URLs).
   * @param historyRepo - Historial de seguimiento.
   * @param slaRepo - SLA configurable (RN-111).
   * @param userRepo - Validar asignación a STAFF+.
   * @param orderRepo - Validar orden opcional.
   * @param cinemaRepo - Validar cine opcional.
   * @param emailService - Correos RN-112.
   */
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PqrsCase)
    private readonly caseRepo: Repository<PqrsCase>,
    @InjectRepository(PqrsComment)
    private readonly commentRepo: Repository<PqrsComment>,
    @InjectRepository(PqrsAttachment)
    private readonly attachmentRepo: Repository<PqrsAttachment>,
    @InjectRepository(PqrsHistory)
    private readonly historyRepo: Repository<PqrsHistory>,
    @InjectRepository(PqrsSlaConfig)
    private readonly slaRepo: Repository<PqrsSlaConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Crea un caso PQRS para el usuario autenticado.
   *
   * @param userId - Cliente del JWT.
   * @param email - Correo para notificar (RN-112).
   * @param dto - Categoría, asunto, descripción, adjuntos opcionales.
   */
  async create(
    userId: string,
    email: string,
    dto: CreatePqrsDto,
  ): Promise<PqrsCaseView> {
    if (dto.orderId) {
      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId, userId },
      });
      if (!order) {
        throw new NotFoundException({
          message: 'Orden no encontrada o no pertenece al usuario',
          code: 'ORDER_NOT_FOUND',
        });
      }
    }
    if (dto.cinemaId) {
      const cinema = await this.cinemaRepo.findOne({
        where: { id: dto.cinemaId },
      });
      if (!cinema) {
        throw new NotFoundException({
          message: 'Complejo no encontrado',
          code: 'CINEMA_NOT_FOUND',
        });
      }
    }

    const slaHours = await this.resolveSlaHours(dto.category);
    const now = new Date();
    const slaDueAt = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    const saved = await this.dataSource.transaction(async (manager) => {
      const ticketNumber = await this.nextTicketNumber(manager, now);
      const caseRepo = manager.getRepository(PqrsCase);
      const historyRepo = manager.getRepository(PqrsHistory);
      const attachmentRepo = manager.getRepository(PqrsAttachment);

      const row = caseRepo.create({
        ticketNumber,
        userId,
        category: dto.category,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        status: PqrsStatus.OPEN,
        assignedToUserId: null,
        slaHours,
        slaDueAt,
        orderId: dto.orderId ?? null,
        cinemaId: dto.cinemaId ?? null,
        closedAt: null,
      });
      const pqrs = await caseRepo.save(row);

      await historyRepo.save(
        historyRepo.create({
          pqrsId: pqrs.id,
          event: PqrsHistoryEvent.CREATED,
          actorUserId: userId,
          message: `Caso ${ticketNumber} creado (${PQRS_CATEGORY_LABEL[dto.category]})`,
          metadata: { category: dto.category, slaHours },
        }),
      );

      for (const att of dto.attachments ?? []) {
        await attachmentRepo.save(
          attachmentRepo.create({
            pqrsId: pqrs.id,
            uploadedByUserId: userId,
            fileName: att.fileName.trim(),
            mimeType: att.mimeType.trim(),
            url: att.url.trim(),
          }),
        );
        await historyRepo.save(
          historyRepo.create({
            pqrsId: pqrs.id,
            event: PqrsHistoryEvent.ATTACHMENT_ADDED,
            actorUserId: userId,
            message: `Adjunto: ${att.fileName.trim()}`,
            metadata: { fileName: att.fileName.trim() },
          }),
        );
      }

      return pqrs;
    });

    await this.emailService.sendPqrsCreated({
      userId,
      toEmail: email,
      ticketNumber: saved.ticketNumber,
      categoryLabel: PQRS_CATEGORY_LABEL[saved.category],
      subject: saved.subject,
      statusLabel: PQRS_STATUS_LABEL[saved.status],
      slaDueAt: saved.slaDueAt.toISOString(),
      pqrsId: saved.id,
    });

    return this.getDetail(userId, UserRole.CUSTOMER, saved.id);
  }

  /**
   * Lista casos: propios (cliente) o todos (STAFF+).
   *
   * @param userId - JWT.
   * @param role - Rol para filtrar alcance.
   * @param status - Filtro opcional de estado.
   */
  async list(
    userId: string,
    role: UserRole,
    status?: PqrsStatus,
  ): Promise<PqrsListResponse> {
    const where: { userId?: string; status?: PqrsStatus } = {};
    if (!roleSatisfies(role, UserRole.STAFF)) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }

    const rows = await this.caseRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return { cases: rows.map((r) => this.toSummary(r)) };
  }

  /**
   * Detalle con comentarios, adjuntos e historial.
   *
   * @param userId - Quién consulta.
   * @param role - STAFF+ ve internos y cualquier caso.
   * @param pqrsId - UUID del caso.
   */
  async getDetail(
    userId: string,
    role: UserRole,
    pqrsId: string,
  ): Promise<PqrsCaseView> {
    const isStaff = roleSatisfies(role, UserRole.STAFF);
    const pqrs = await this.caseRepo.findOne({ where: { id: pqrsId } });
    if (!pqrs) {
      throw new NotFoundException({
        message: 'Caso PQRS no encontrado',
        code: 'PQRS_NOT_FOUND',
      });
    }
    if (!isStaff && pqrs.userId !== userId) {
      throw new ForbiddenException({
        message: 'No puedes consultar este caso',
        code: 'PQRS_FORBIDDEN',
      });
    }

    const [comments, attachments, history] = await Promise.all([
      this.commentRepo.find({
        where: { pqrsId },
        order: { createdAt: 'ASC' },
      }),
      this.attachmentRepo.find({
        where: { pqrsId },
        order: { createdAt: 'ASC' },
      }),
      this.historyRepo.find({
        where: { pqrsId },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const visibleComments = isStaff
      ? comments
      : comments.filter((c) => !c.isInternal);

    return {
      ...this.toSummary(pqrs),
      comments: visibleComments.map((c) => this.toCommentView(c)),
      attachments: attachments.map((a) => this.toAttachmentView(a)),
      history: history.map((h) => this.toHistoryView(h)),
    };
  }

  /**
   * Actualiza un caso: comentario, adjuntos, estado y/o asignación.
   *
   * @param actor - JWT (userId, email, role).
   * @param pqrsId - Caso.
   * @param dto - Campos a mutar.
   */
  async update(
    actor: { userId: string; email: string; role: UserRole },
    pqrsId: string,
    dto: UpdatePqrsDto,
  ): Promise<PqrsCaseView> {
    const isStaff = roleSatisfies(actor.role, UserRole.STAFF);
    const pqrs = await this.caseRepo.findOne({ where: { id: pqrsId } });
    if (!pqrs) {
      throw new NotFoundException({
        message: 'Caso PQRS no encontrado',
        code: 'PQRS_NOT_FOUND',
      });
    }
    if (!isStaff && pqrs.userId !== actor.userId) {
      throw new ForbiddenException({
        message: 'No puedes modificar este caso',
        code: 'PQRS_FORBIDDEN',
      });
    }

    const hasStaffOnly =
      dto.status !== undefined ||
      dto.assignedToUserId !== undefined ||
      dto.commentInternal === true;
    if (hasStaffOnly && !isStaff) {
      throw new ForbiddenException({
        message: 'Solo personal puede cambiar estado, asignar o comentar interno',
        code: 'PQRS_STAFF_ONLY',
      });
    }

    if (
      !dto.status &&
      dto.assignedToUserId === undefined &&
      !dto.comment &&
      !(dto.attachments && dto.attachments.length > 0)
    ) {
      throw new BadRequestException({
        message: 'Debes enviar al menos un cambio (status, asignación, comentario o adjuntos)',
        code: 'PQRS_EMPTY_UPDATE',
      });
    }

    if (TERMINAL.has(pqrs.status) && (dto.status || dto.comment || dto.attachments)) {
      if (pqrs.status === PqrsStatus.CLOSED || pqrs.status === PqrsStatus.CANCELLED) {
        if (!isStaff || dto.status === undefined) {
          throw new BadRequestException({
            message: 'El caso está cerrado o cancelado',
            code: 'PQRS_TERMINAL',
          });
        }
      }
    }

    let statusChanged = false;
    let assignedChanged = false;
    let publicCommentAdded = false;
    const prevStatus = pqrs.status;

    if (dto.assignedToUserId !== undefined) {
      if (dto.assignedToUserId === null) {
        pqrs.assignedToUserId = null;
        assignedChanged = true;
        await this.historyRepo.save(
          this.historyRepo.create({
            pqrsId,
            event: PqrsHistoryEvent.ASSIGNED,
            actorUserId: actor.userId,
            message: 'Caso desasignado',
            metadata: { assignedToUserId: null },
          }),
        );
      } else {
        const assignee = await this.userRepo.findOne({
          where: { id: dto.assignedToUserId },
        });
        if (!assignee || !roleSatisfies(assignee.role, UserRole.STAFF)) {
          throw new BadRequestException({
            message: 'El asignado debe ser STAFF o superior',
            code: 'PQRS_INVALID_ASSIGNEE',
          });
        }
        pqrs.assignedToUserId = assignee.id;
        assignedChanged = true;
        await this.historyRepo.save(
          this.historyRepo.create({
            pqrsId,
            event: PqrsHistoryEvent.ASSIGNED,
            actorUserId: actor.userId,
            message: `Asignado a ${assignee.email}`,
            metadata: { assignedToUserId: assignee.id },
          }),
        );
      }
    }

    if (dto.status !== undefined && dto.status !== pqrs.status) {
      pqrs.status = dto.status;
      statusChanged = true;
      if (TERMINAL.has(dto.status)) {
        pqrs.closedAt = new Date();
      } else {
        pqrs.closedAt = null;
      }
      await this.historyRepo.save(
        this.historyRepo.create({
          pqrsId,
          event: PqrsHistoryEvent.STATUS_CHANGED,
          actorUserId: actor.userId,
          message: `Estado: ${PQRS_STATUS_LABEL[prevStatus]} → ${PQRS_STATUS_LABEL[dto.status]}`,
          metadata: { from: prevStatus, to: dto.status },
        }),
      );
    }

    if (dto.comment?.trim()) {
      const isInternal = Boolean(dto.commentInternal) && isStaff;
      await this.commentRepo.save(
        this.commentRepo.create({
          pqrsId,
          authorUserId: actor.userId,
          body: dto.comment.trim(),
          isInternal,
        }),
      );
      await this.historyRepo.save(
        this.historyRepo.create({
          pqrsId,
          event: PqrsHistoryEvent.COMMENT_ADDED,
          actorUserId: actor.userId,
          message: isInternal ? 'Comentario interno agregado' : 'Comentario agregado',
          metadata: { isInternal },
        }),
      );
      if (!isInternal) {
        publicCommentAdded = true;
      }
    }

    for (const att of dto.attachments ?? []) {
      await this.attachmentRepo.save(
        this.attachmentRepo.create({
          pqrsId,
          uploadedByUserId: actor.userId,
          fileName: att.fileName.trim(),
          mimeType: att.mimeType.trim(),
          url: att.url.trim(),
        }),
      );
      await this.historyRepo.save(
        this.historyRepo.create({
          pqrsId,
          event: PqrsHistoryEvent.ATTACHMENT_ADDED,
          actorUserId: actor.userId,
          message: `Adjunto: ${att.fileName.trim()}`,
          metadata: { fileName: att.fileName.trim() },
        }),
      );
    }

    await this.caseRepo.save(pqrs);

    const owner = await this.userRepo.findOne({ where: { id: pqrs.userId } });
    if (owner && (statusChanged || publicCommentAdded || assignedChanged)) {
      const notifyResolved =
        statusChanged &&
        (pqrs.status === PqrsStatus.RESOLVED ||
          pqrs.status === PqrsStatus.CLOSED);

      if (notifyResolved) {
        await this.emailService.sendPqrsResolved({
          userId: owner.id,
          toEmail: owner.email,
          ticketNumber: pqrs.ticketNumber,
          categoryLabel: PQRS_CATEGORY_LABEL[pqrs.category],
          subject: pqrs.subject,
          statusLabel: PQRS_STATUS_LABEL[pqrs.status],
          pqrsId: pqrs.id,
        });
      } else if (statusChanged || publicCommentAdded) {
        await this.emailService.sendPqrsUpdated({
          userId: owner.id,
          toEmail: owner.email,
          ticketNumber: pqrs.ticketNumber,
          categoryLabel: PQRS_CATEGORY_LABEL[pqrs.category],
          subject: pqrs.subject,
          statusLabel: PQRS_STATUS_LABEL[pqrs.status],
          updateSummary: statusChanged
            ? `Nuevo estado: ${PQRS_STATUS_LABEL[pqrs.status]}`
            : 'Hay un nuevo comentario en tu caso',
          pqrsId: pqrs.id,
        });
      }
    }

    return this.getDetail(actor.userId, actor.role, pqrsId);
  }

  /**
   * Lista configuración SLA vigente (RN-111).
   */
  async listSla(): Promise<PqrsSlaListResponse> {
    const rows = await this.slaRepo.find({ order: { category: 'ASC' } });
    const byCat = new Map(rows.map((r) => [r.category, r]));
    const configs: PqrsSlaConfigView[] = Object.values(PqrsCategory).map(
      (category) => {
        const row = byCat.get(category);
        return {
          category,
          hours: row?.hours ?? DEFAULT_PQRS_SLA_HOURS[category],
          updatedAt: (row?.updatedAt ?? new Date(0)).toISOString(),
        };
      },
    );
    return { configs };
  }

  /**
   * Actualiza horas SLA de una categoría (ADMIN+, RN-111).
   * No altera `slaDueAt` de casos ya abiertos (snapshot).
   *
   * @param dto - Categoría + horas.
   */
  async updateSla(dto: UpdatePqrsSlaDto): Promise<PqrsSlaConfigView> {
    let row = await this.slaRepo.findOne({ where: { category: dto.category } });
    if (!row) {
      row = this.slaRepo.create({ category: dto.category, hours: dto.hours });
    } else {
      row.hours = dto.hours;
    }
    const saved = await this.slaRepo.save(row);
    return {
      category: saved.category,
      hours: saved.hours,
      updatedAt: saved.updatedAt.toISOString(),
    };
  }

  /**
   * Genera el siguiente `PQRS-YYYY-NNNNNN` bajo lock (RN-110).
   *
   * @param manager - EntityManager de la transacción.
   * @param now - Fecha de creación (año).
   */
  private async nextTicketNumber(
    manager: EntityManager,
    now: Date,
  ): Promise<string> {
    const year = now.getUTCFullYear();
    const counterRepo = manager.getRepository(PqrsCounter);
    let counter = await counterRepo.findOne({
      where: { year },
      lock: { mode: 'pessimistic_write' },
    });
    if (!counter) {
      await counterRepo.insert({ year, lastNumber: 0 });
      counter = await counterRepo.findOne({
        where: { year },
        lock: { mode: 'pessimistic_write' },
      });
    }
    if (!counter) {
      throw new BadRequestException({
        message: 'No se pudo generar el consecutivo PQRS',
        code: 'PQRS_COUNTER_FAILED',
      });
    }
    counter.lastNumber += 1;
    await counterRepo.save(counter);
    const seq = String(counter.lastNumber).padStart(6, '0');
    return `PQRS-${year}-${seq}`;
  }

  /**
   * Lee horas SLA de config o default (RN-111).
   *
   * @param category - Categoría del caso.
   */
  private async resolveSlaHours(category: PqrsCategory): Promise<number> {
    const cfg = await this.slaRepo.findOne({ where: { category } });
    return cfg?.hours ?? DEFAULT_PQRS_SLA_HOURS[category];
  }

  /** Resumen sin colecciones anidadas. */
  private toSummary(pqrs: PqrsCase): PqrsCaseView {
    const closed = TERMINAL.has(pqrs.status);
    const slaBreached = !closed && pqrs.slaDueAt.getTime() < Date.now();
    return {
      id: pqrs.id,
      ticketNumber: pqrs.ticketNumber,
      userId: pqrs.userId,
      category: pqrs.category,
      subject: pqrs.subject,
      description: pqrs.description,
      status: pqrs.status,
      assignedToUserId: pqrs.assignedToUserId,
      slaHours: pqrs.slaHours,
      slaDueAt: pqrs.slaDueAt.toISOString(),
      slaBreached,
      orderId: pqrs.orderId,
      cinemaId: pqrs.cinemaId,
      closedAt: pqrs.closedAt ? pqrs.closedAt.toISOString() : null,
      createdAt: pqrs.createdAt.toISOString(),
      updatedAt: pqrs.updatedAt.toISOString(),
    };
  }

  private toCommentView(c: PqrsComment): PqrsCommentView {
    return {
      id: c.id,
      authorUserId: c.authorUserId,
      body: c.body,
      isInternal: c.isInternal,
      createdAt: c.createdAt.toISOString(),
    };
  }

  private toAttachmentView(a: PqrsAttachment): PqrsAttachmentView {
    return {
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      url: a.url,
      uploadedByUserId: a.uploadedByUserId,
      createdAt: a.createdAt.toISOString(),
    };
  }

  private toHistoryView(h: PqrsHistory): PqrsHistoryView {
    return {
      event: h.event,
      actorUserId: h.actorUserId,
      message: h.message,
      metadata: h.metadata,
      createdAt: h.createdAt.toISOString(),
    };
  }
}
