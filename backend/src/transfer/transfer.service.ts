import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../notifications/email.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket.enums';
import { TicketsService } from '../tickets/tickets.service';
import {
  TransferAcceptResponse,
  TransferCreateResponse,
  TransferListResponse,
  TicketTransferView,
} from './dto/transfer-response';
import { AcceptTransferDto, TransferTicketsDto } from './dto/transfer.dto';
import { TicketTransfer } from './entities/ticket-transfer.entity';
import { TicketTransferStatus } from './enums/transfer.enums';

/** Ventana mínima antes del inicio (RN-071): 1 hora. */
export const TRANSFER_MIN_LEAD_MS = 60 * 60 * 1000;

/**
 * Cesión digital de entradas entre usuarios (HU-017).
 *
 * Flujo: solicitar → correo (aceptar / invitar) → aceptar → anular QR
 * → emitir nuevos → auditoría en `ticket_transfers` (RN-071…075).
 *
 * Separado de `TicketsService` (SRP): emisión/validación vs orquestación
 * de titularidad.
 */
@Injectable()
export class TransferService {
  /**
   * @param transferRepo - Solicitudes / auditoría de cesión.
   * @param ticketRepo - Entradas a ceder.
   * @param userRepo - Búsqueda por email del destinatario.
   * @param ticketsService - Anular QR + emitir para el nuevo titular.
   * @param emailService - Correos TICKET_TRANSFER / invitación.
   */
  constructor(
    @InjectRepository(TicketTransfer)
    private readonly transferRepo: Repository<TicketTransfer>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly ticketsService: TicketsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * `POST /tickets/transfer`: inicia la cesión (aún no cambia el QR).
   *
   * @param fromUserId - JWT del titular actual.
   * @param dto - Entradas + datos del nuevo asistente.
   * @returns Transferencia PENDING + mensaje.
   */
  async requestTransfer(
    fromUserId: string,
    dto: TransferTicketsDto,
  ): Promise<TransferCreateResponse> {
    const toEmail = dto.recipientEmail.trim().toLowerCase();
    const toName = dto.recipientName.trim();
    const toDocumentNumber = dto.recipientDocumentNumber.trim();

    const fromUser = await this.userRepo.findOne({ where: { id: fromUserId } });
    if (!fromUser) {
      throw new NotFoundException('Usuario emisor no encontrado');
    }
    if (fromUser.email === toEmail) {
      throw new BadRequestException(
        'No puedes transferir entradas a tu propio correo',
      );
    }

    const uniqueIds = [...new Set(dto.ticketIds)];
    const tickets = await this.ticketRepo.find({
      where: { id: In(uniqueIds) },
    });
    if (tickets.length !== uniqueIds.length) {
      throw new NotFoundException('Una o más entradas no existen');
    }

    const now = Date.now();
    for (const ticket of tickets) {
      if (ticket.userId !== fromUserId) {
        throw new ForbiddenException(
          'Solo puedes transferir entradas de las que eres titular',
        );
      }
      if (ticket.status !== TicketStatus.VALID) {
        throw new ConflictException(
          `La entrada ${ticket.code} no está VALID (estado: ${ticket.status})`,
        );
      }
      if (ticket.transferCount >= 1) {
        throw new ConflictException(
          `La entrada ${ticket.code} ya fue transferida una vez (RN-072)`,
        );
      }
      if (ticket.startsAt.getTime() - now < TRANSFER_MIN_LEAD_MS) {
        throw new ConflictException(
          'Solo se puede transferir hasta 1 hora antes de la función (RN-071)',
        );
      }
    }

    const orderIds = new Set(tickets.map((t) => t.orderId));
    if (orderIds.size !== 1) {
      throw new BadRequestException(
        'Todas las entradas de una cesión deben pertenecer a la misma orden',
      );
    }

    await this.assertNoPendingOverlap(uniqueIds);

    const recipient = await this.userRepo.findOne({ where: { email: toEmail } });
    const recipientInvited = !recipient;
    const acceptToken = randomBytes(32).toString('hex');

    const transfer = await this.transferRepo.save(
      this.transferRepo.create({
        fromUserId,
        toUserId: recipient?.id ?? null,
        toEmail,
        toName,
        toDocumentType: dto.recipientDocumentType,
        toDocumentNumber,
        recipientInvited,
        status: TicketTransferStatus.PENDING,
        acceptToken,
        sourceTicketIdsJson: JSON.stringify(uniqueIds),
        orderId: tickets[0].orderId,
        movieTitle: tickets[0].movieTitle,
        startsAt: tickets[0].startsAt,
        cancelledTicketIdsJson: '[]',
        newTicketIdsJson: '[]',
        acceptedAt: null,
      }),
    );

    await this.dispatchRequestEmails(transfer, fromUser.email, recipientInvited);

    return {
      transfer: this.toView(transfer, true),
      message: recipientInvited
        ? 'Transferencia creada. Se envió invitación a registrarse; el destinatario debe aceptar tras crear su cuenta (RN-073).'
        : 'Transferencia creada. El destinatario debe aceptarla para emitir el nuevo QR (RN-073).',
    };
  }

  /**
   * `GET /tickets/transfer`: cesiones enviadas y recibidas del JWT.
   *
   * @param userId - JWT.
   * @param email - Email del JWT (para recibidas por invitación).
   */
  async listMine(userId: string, email: string): Promise<TransferListResponse> {
    const normalized = email.trim().toLowerCase();
    const sent = await this.transferRepo.find({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const received = await this.transferRepo.find({
      where: [{ toUserId: userId }, { toEmail: normalized }],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const receivedDedup = new Map<string, TicketTransfer>();
    for (const row of received) {
      receivedDedup.set(row.id, row);
    }

    return {
      sent: sent.map((t) => this.toView(t, t.fromUserId === userId)),
      received: [...receivedDedup.values()].map((t) =>
        this.toView(t, t.fromUserId === userId),
      ),
    };
  }

  /**
   * `POST /tickets/transfer/accept`: acepta y completa la cesión (RN-073/074).
   *
   * @param acceptorUserId - JWT del nuevo titular.
   * @param acceptorEmail - Email del JWT (debe coincidir con `toEmail`).
   * @param dto - `transferId` o `acceptToken`.
   */
  async acceptTransfer(
    acceptorUserId: string,
    acceptorEmail: string,
    dto: AcceptTransferDto,
  ): Promise<TransferAcceptResponse> {
    if (!dto.transferId && !dto.acceptToken) {
      throw new BadRequestException(
        'Debes indicar transferId o acceptToken',
      );
    }

    const transfer = dto.acceptToken
      ? await this.transferRepo.findOne({
          where: { acceptToken: dto.acceptToken },
        })
      : await this.transferRepo.findOne({
          where: { id: dto.transferId },
        });

    if (!transfer) {
      throw new NotFoundException('Transferencia no encontrada');
    }

    await this.ensureStillPending(transfer);

    const email = acceptorEmail.trim().toLowerCase();
    if (transfer.toEmail !== email) {
      throw new ForbiddenException(
        'Solo el destinatario del correo puede aceptar esta transferencia (RN-073)',
      );
    }
    if (transfer.fromUserId === acceptorUserId) {
      throw new BadRequestException(
        'El emisor no puede aceptar su propia transferencia',
      );
    }

    const sourceIds = this.parseIds(transfer.sourceTicketIdsJson);
    const sources = await this.ticketRepo.find({
      where: { id: In(sourceIds) },
    });
    if (sources.length !== sourceIds.length) {
      throw new ConflictException(
        'Faltan entradas origen; la cesión no puede completarse',
      );
    }

    const now = Date.now();
    for (const ticket of sources) {
      if (ticket.userId !== transfer.fromUserId) {
        throw new ConflictException(
          `La entrada ${ticket.code} ya no pertenece al emisor`,
        );
      }
      if (ticket.status !== TicketStatus.VALID) {
        throw new ConflictException(
          `La entrada ${ticket.code} ya no está VALID`,
        );
      }
      if (ticket.startsAt.getTime() - now < TRANSFER_MIN_LEAD_MS) {
        transfer.status = TicketTransferStatus.EXPIRED;
        await this.transferRepo.save(transfer);
        throw new ConflictException(
          'La ventana de 1 hora antes de la función ya venció (RN-071)',
        );
      }
    }

    const cancelledIds = await this.ticketsService.cancelTicketsByIds(sourceIds);
    const newTickets = await this.ticketsService.emitTicketsForTransfer(
      sources,
      acceptorUserId,
      transfer.toName,
    );

    transfer.toUserId = acceptorUserId;
    transfer.status = TicketTransferStatus.ACCEPTED;
    transfer.cancelledTicketIdsJson = JSON.stringify(cancelledIds);
    transfer.newTicketIdsJson = JSON.stringify(newTickets.map((t) => t.id));
    transfer.acceptedAt = new Date();
    transfer.acceptToken = `used-${transfer.id.replace(/-/g, '').slice(0, 24)}`;
    await this.transferRepo.save(transfer);

    await this.dispatchAcceptedEmails(transfer, newTickets.length);

    return {
      transfer: this.toView(transfer, false),
      newTickets: newTickets.map((t) => ({
        id: t.id,
        code: t.code,
        qrPayload: t.qrPayload,
        seatLabel: t.seatLabel,
        status: t.status,
      })),
      message:
        'Transferencia aceptada. Los QR anteriores quedaron anulados y se emitieron nuevos (RN-074).',
    };
  }

  /**
   * Asocia transferencias PENDING por email tras registro/activación.
   *
   * No completa la cesión (sigue haciendo falta `accept`); solo enlaza
   * `toUserId` para que aparezcan en “recibidas”.
   *
   * @param userId - Usuario recién activado.
   * @param email - Correo normalizado.
   * @returns Cantidad de filas actualizadas.
   */
  async linkPendingTransfersByEmail(
    userId: string,
    email: string,
  ): Promise<number> {
    const normalized = email.trim().toLowerCase();
    const orphans = (
      await this.transferRepo.find({
        where: {
          toEmail: normalized,
          status: TicketTransferStatus.PENDING,
        },
      })
    ).filter((t) => t.toUserId === null);

    for (const row of orphans) {
      row.toUserId = userId;
    }
    if (orphans.length > 0) {
      await this.transferRepo.save(orphans);
    }
    return orphans.length;
  }

  private async assertNoPendingOverlap(ticketIds: string[]): Promise<void> {
    const pendings = await this.transferRepo.find({
      where: { status: TicketTransferStatus.PENDING },
    });
    const blocked = new Set<string>();
    for (const p of pendings) {
      for (const id of this.parseIds(p.sourceTicketIdsJson)) {
        blocked.add(id);
      }
    }
    const clash = ticketIds.find((id) => blocked.has(id));
    if (clash) {
      throw new ConflictException(
        `La entrada ${clash} ya tiene una transferencia PENDING`,
      );
    }
  }

  private async ensureStillPending(transfer: TicketTransfer): Promise<void> {
    if (transfer.status === TicketTransferStatus.ACCEPTED) {
      throw new ConflictException('Esta transferencia ya fue aceptada');
    }
    if (transfer.status === TicketTransferStatus.CANCELLED) {
      throw new ConflictException('Esta transferencia fue cancelada');
    }
    if (transfer.status === TicketTransferStatus.EXPIRED) {
      throw new ConflictException('Esta transferencia expiró (RN-071)');
    }
    if (transfer.status !== TicketTransferStatus.PENDING) {
      throw new ConflictException(`Estado inválido: ${transfer.status}`);
    }

    if (transfer.startsAt.getTime() - Date.now() < TRANSFER_MIN_LEAD_MS) {
      transfer.status = TicketTransferStatus.EXPIRED;
      await this.transferRepo.save(transfer);
      throw new ConflictException(
        'La ventana de 1 hora antes de la función ya venció (RN-071)',
      );
    }
  }

  private async dispatchRequestEmails(
    transfer: TicketTransfer,
    fromEmail: string,
    invited: boolean,
  ): Promise<void> {
    try {
      if (invited) {
        await this.emailService.sendTicketTransferInvite({
          toEmail: transfer.toEmail,
          toName: transfer.toName,
          fromEmail,
          movieTitle: transfer.movieTitle,
          startsAt: transfer.startsAt.toISOString(),
          transferId: transfer.id,
          acceptToken: transfer.acceptToken,
          seatCount: this.parseIds(transfer.sourceTicketIdsJson).length,
        });
      } else if (transfer.toUserId) {
        await this.emailService.sendTicketTransferRequest({
          userId: transfer.toUserId,
          toEmail: transfer.toEmail,
          toName: transfer.toName,
          fromEmail,
          movieTitle: transfer.movieTitle,
          startsAt: transfer.startsAt.toISOString(),
          transferId: transfer.id,
          acceptToken: transfer.acceptToken,
          seatCount: this.parseIds(transfer.sourceTicketIdsJson).length,
        });
      }
      await this.emailService.sendTicketTransferNoticeToSender({
        userId: transfer.fromUserId,
        email: fromEmail,
        toEmail: transfer.toEmail,
        toName: transfer.toName,
        movieTitle: transfer.movieTitle,
        startsAt: transfer.startsAt.toISOString(),
        transferId: transfer.id,
        seatCount: this.parseIds(transfer.sourceTicketIdsJson).length,
        invited,
      });
    } catch {
      /* El correo no debe abortar la cesión (mismo criterio HU-016). */
    }
  }

  private async dispatchAcceptedEmails(
    transfer: TicketTransfer,
    seatCount: number,
  ): Promise<void> {
    try {
      const fromUser = await this.userRepo.findOne({
        where: { id: transfer.fromUserId },
      });
      if (transfer.toUserId) {
        await this.emailService.sendTicketTransferAccepted({
          userId: transfer.toUserId,
          toEmail: transfer.toEmail,
          toName: transfer.toName,
          movieTitle: transfer.movieTitle,
          startsAt: transfer.startsAt.toISOString(),
          transferId: transfer.id,
          seatCount,
          role: 'recipient',
        });
      }
      if (fromUser) {
        await this.emailService.sendTicketTransferAccepted({
          userId: fromUser.id,
          toEmail: fromUser.email,
          toName: transfer.toName,
          movieTitle: transfer.movieTitle,
          startsAt: transfer.startsAt.toISOString(),
          transferId: transfer.id,
          seatCount,
          role: 'sender',
        });
      }
    } catch {
      /* swallow */
    }
  }

  private parseIds(json: string): string[] {
    try {
      const parsed = JSON.parse(json) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private toView(
    transfer: TicketTransfer,
    includeToken: boolean,
  ): TicketTransferView {
    return {
      id: transfer.id,
      status: transfer.status,
      fromUserId: transfer.fromUserId,
      toUserId: transfer.toUserId,
      toEmail: transfer.toEmail,
      toName: transfer.toName,
      toDocumentType: transfer.toDocumentType,
      toDocumentNumber: transfer.toDocumentNumber,
      recipientInvited: transfer.recipientInvited,
      orderId: transfer.orderId,
      movieTitle: transfer.movieTitle,
      startsAt: transfer.startsAt.toISOString(),
      sourceTicketIds: this.parseIds(transfer.sourceTicketIdsJson),
      cancelledTicketIds: this.parseIds(transfer.cancelledTicketIdsJson),
      newTicketIds: this.parseIds(transfer.newTicketIdsJson),
      acceptToken: includeToken ? transfer.acceptToken : null,
      acceptedAt: transfer.acceptedAt?.toISOString() ?? null,
      createdAt: transfer.createdAt.toISOString(),
    };
  }
}
