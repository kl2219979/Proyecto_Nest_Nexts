import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentType } from '../auth/enums/user.enums';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../notifications/email.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket.enums';
import { TicketsService } from '../tickets/tickets.service';
import { TicketTransfer } from './entities/ticket-transfer.entity';
import { TicketTransferStatus } from './enums/transfer.enums';
import {
  TRANSFER_MIN_LEAD_MS,
  TransferService,
} from './transfer.service';

describe('TransferService (HU-017)', () => {
  const fromUserId = 'user-from';
  const toUserId = 'user-to';
  const ticketId = 'tkt-1';
  const orderId = 'order-1';
  const startsFar = new Date(Date.now() + 5 * TRANSFER_MIN_LEAD_MS);

  const transferRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({
      ...x,
      id: x.id ?? 'xfer-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const ticketRepo = {
    find: jest.fn(),
  };
  const userRepo = {
    findOne: jest.fn(),
  };
  const ticketsService = {
    cancelTicketsByIds: jest.fn().mockResolvedValue([ticketId]),
    emitTicketsForTransfer: jest.fn().mockResolvedValue([
      {
        id: 'tkt-new',
        code: 'TKT-NEW',
        qrPayload: 'MCQR-new',
        seatLabel: 'A1',
        status: TicketStatus.VALID,
        transferCount: 1,
      },
    ]),
  };
  const emailService = {
    sendTicketTransferRequest: jest.fn().mockResolvedValue({}),
    sendTicketTransferInvite: jest.fn().mockResolvedValue({}),
    sendTicketTransferNoticeToSender: jest.fn().mockResolvedValue({}),
    sendTicketTransferAccepted: jest.fn().mockResolvedValue({}),
  };

  let service: TransferService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: getRepositoryToken(TicketTransfer), useValue: transferRepo },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: TicketsService, useValue: ticketsService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();
    service = module.get(TransferService);
  });

  function validTicket(overrides: Partial<Ticket> = {}): Ticket {
    return {
      id: ticketId,
      orderId,
      userId: fromUserId,
      status: TicketStatus.VALID,
      transferCount: 0,
      startsAt: startsFar,
      movieTitle: 'Demo',
      code: 'TKT-OLD',
      seatLabel: 'A1',
      ...overrides,
    } as Ticket;
  }

  describe('requestTransfer', () => {
    it('crea PENDING y notifica si el destinatario existe', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ id: fromUserId, email: 'from@x.com' })
        .mockResolvedValueOnce({ id: toUserId, email: 'to@x.com' });
      ticketRepo.find.mockResolvedValue([validTicket()]);
      transferRepo.find.mockResolvedValue([]);

      const result = await service.requestTransfer(fromUserId, {
        ticketIds: [ticketId],
        recipientName: 'Ana',
        recipientEmail: 'to@x.com',
        recipientDocumentType: DocumentType.CC,
        recipientDocumentNumber: '123',
      });

      expect(result.transfer.status).toBe(TicketTransferStatus.PENDING);
      expect(result.transfer.toUserId).toBe(toUserId);
      expect(result.transfer.recipientInvited).toBe(false);
      expect(emailService.sendTicketTransferRequest).toHaveBeenCalled();
      expect(emailService.sendTicketTransferInvite).not.toHaveBeenCalled();
    });

    it('invita a registrarse si no hay cuenta (RN invite)', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ id: fromUserId, email: 'from@x.com' })
        .mockResolvedValueOnce(null);
      ticketRepo.find.mockResolvedValue([validTicket()]);
      transferRepo.find.mockResolvedValue([]);

      const result = await service.requestTransfer(fromUserId, {
        ticketIds: [ticketId],
        recipientName: 'Ana',
        recipientEmail: 'new@x.com',
        recipientDocumentType: DocumentType.CC,
        recipientDocumentNumber: '123',
      });

      expect(result.transfer.recipientInvited).toBe(true);
      expect(result.transfer.toUserId).toBeNull();
      expect(emailService.sendTicketTransferInvite).toHaveBeenCalled();
    });

    it('rechaza si falta menos de 1 h (RN-071)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: fromUserId,
        email: 'from@x.com',
      });
      ticketRepo.find.mockResolvedValue([
        validTicket({
          startsAt: new Date(Date.now() + 10 * 60 * 1000),
        }),
      ]);
      transferRepo.find.mockResolvedValue([]);

      await expect(
        service.requestTransfer(fromUserId, {
          ticketIds: [ticketId],
          recipientName: 'Ana',
          recipientEmail: 'to@x.com',
          recipientDocumentType: DocumentType.CC,
          recipientDocumentNumber: '123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza segunda cesión (RN-072)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: fromUserId,
        email: 'from@x.com',
      });
      ticketRepo.find.mockResolvedValue([
        validTicket({ transferCount: 1 }),
      ]);
      transferRepo.find.mockResolvedValue([]);

      await expect(
        service.requestTransfer(fromUserId, {
          ticketIds: [ticketId],
          recipientName: 'Ana',
          recipientEmail: 'to@x.com',
          recipientDocumentType: DocumentType.CC,
          recipientDocumentNumber: '123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza si no eres titular', async () => {
      userRepo.findOne.mockResolvedValue({
        id: fromUserId,
        email: 'from@x.com',
      });
      ticketRepo.find.mockResolvedValue([
        validTicket({ userId: 'otro' }),
      ]);
      transferRepo.find.mockResolvedValue([]);

      await expect(
        service.requestTransfer(fromUserId, {
          ticketIds: [ticketId],
          recipientName: 'Ana',
          recipientEmail: 'to@x.com',
          recipientDocumentType: DocumentType.CC,
          recipientDocumentNumber: '123',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('acceptTransfer', () => {
    const pending = {
      id: 'xfer-1',
      fromUserId,
      toUserId,
      toEmail: 'to@x.com',
      toName: 'Ana',
      status: TicketTransferStatus.PENDING,
      acceptToken: 'token-abc-def-ghi-jkl',
      sourceTicketIdsJson: JSON.stringify([ticketId]),
      orderId,
      movieTitle: 'Demo',
      startsAt: startsFar,
      cancelledTicketIdsJson: '[]',
      newTicketIdsJson: '[]',
      acceptedAt: null,
      recipientInvited: false,
      toDocumentType: DocumentType.CC,
      toDocumentNumber: '123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('anula QR y emite nuevos al aceptar (RN-073/074)', async () => {
      transferRepo.findOne.mockResolvedValue({ ...pending });
      ticketRepo.find.mockResolvedValue([validTicket()]);

      const result = await service.acceptTransfer(toUserId, 'to@x.com', {
        acceptToken: pending.acceptToken,
      });

      expect(ticketsService.cancelTicketsByIds).toHaveBeenCalledWith([
        ticketId,
      ]);
      expect(ticketsService.emitTicketsForTransfer).toHaveBeenCalled();
      expect(result.transfer.status).toBe(TicketTransferStatus.ACCEPTED);
      expect(result.newTickets).toHaveLength(1);
      expect(emailService.sendTicketTransferAccepted).toHaveBeenCalled();
    });

    it('rechaza si el JWT no es el destinatario', async () => {
      transferRepo.findOne.mockResolvedValue({ ...pending });

      await expect(
        service.acceptTransfer(toUserId, 'otro@x.com', {
          transferId: pending.id,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
