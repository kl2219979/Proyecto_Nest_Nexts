/**
 * Tests unitarios de `TicketsService` (HU-014 / HU-024).
 */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { DocumentPdfService } from './document-pdf.service';
import { Invoice } from './entities/invoice.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus } from './enums/ticket.enums';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  const updateQb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const ticketRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (rows: Ticket[] | Ticket) => {
      const list = Array.isArray(rows) ? rows : [rows];
      return list.map((t, i) => ({
        ...t,
        id: t.id ?? `tkt-${i + 1}`,
        createdAt: t.createdAt ?? new Date('2026-07-30T18:00:00Z'),
        updatedAt: new Date(),
      }));
    }),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => updateQb),
  };

  const invoiceRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Invoice) => ({
      ...x,
      id: x.id ?? 'inv-1',
      createdAt: x.createdAt ?? new Date('2026-07-30T18:00:00Z'),
      updatedAt: new Date(),
    })),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const orderRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (x: Order) => x),
    findOneOrFail: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'demo@multicine.test',
    }),
  };

  const profileRepo = {
    findOne: jest.fn().mockResolvedValue({
      firstName: 'Ana',
      lastName: 'Pérez',
    }),
  };

  const pdfService = {
    buildTicketPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-ticket')),
    buildInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-invoice')),
  };

  const validTicketBase = {
    id: 'tkt-1',
    orderId: 'order-1',
    userId: 'user-1',
    code: 'TKT-ABC12345',
    qrPayload: 'MCQR-a1b2c3d4e5f6789012345678abcdef01',
    status: TicketStatus.VALID,
    ticketType: 'STANDARD',
    movieTitle: 'Demo',
    startsAt: new Date('2026-08-01T20:00:00Z'),
    cinemaName: 'Laureles',
    roomName: 'Sala 1',
    seatLabel: 'A1',
    format: '2D',
    language: 'ESP',
    buyerName: 'Ana Pérez',
    usedAt: null,
    validatedByUserId: null,
    createdAt: new Date('2026-07-30T18:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ticketRepo.findOne.mockResolvedValue(null);
    invoiceRepo.findOne.mockResolvedValue(null);
    updateQb.execute.mockResolvedValue({ affected: 1 });
    ticketRepo.createQueryBuilder.mockReturnValue(updateQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: ticketRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        { provide: DocumentPdfService, useValue: pdfService },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  it('fulfillPaidOrder genera entradas con QR único y factura (RN-057)', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PAID,
      currency: 'COP',
      ticketsSubtotal: 20000,
      snacksSubtotal: 12000,
      subtotal: 32000,
      membershipDiscount: 0,
      promoDiscount: 0,
      giftcardAmount: 0,
      tax: 6080,
      total: 38080,
      promoCode: null,
      cinemaName: 'Laureles',
      ticketsGenerated: false,
      invoiceGenerated: false,
      tickets: [
        {
          id: 'oti-1',
          seatId: 'seat-a',
          seatLabel: 'A1',
          movieTitle: 'Demo',
          startsAt: new Date('2026-08-01T20:00:00Z'),
          cinemaName: 'Laureles',
          roomName: 'Sala 1',
          format: '2D',
          language: 'ESP',
          unitPrice: 20000,
          lineTotal: 20000,
        },
      ],
      snacks: [
        {
          snackId: 'snack-1',
          name: 'Crispetas',
          quantity: 1,
          unitPrice: 12000,
          lineTotal: 12000,
        },
      ],
    });

    const result = await service.fulfillPaidOrder('order-1');

    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].code).toMatch(/^TKT-[A-F0-9]{8}$/);
    expect(result.tickets[0].qr.payload).toMatch(/^MCQR-[a-f0-9]{32}$/);
    expect(result.tickets[0].qr.singleUse).toBe(true);
    expect(result.tickets[0].buyerName).toBe('Ana Pérez');
    expect(result.tickets[0].status).toBe(TicketStatus.VALID);
    expect(result.tickets[0].validatedByUserId).toBeNull();
    expect(result.invoice.number).toMatch(/^FE-\d{8}-[A-F0-9]{6}$/);
    expect(result.invoice.total).toBe(38080);
    expect(result.invoice.lines).toHaveLength(2);
    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketsGenerated: true,
        invoiceGenerated: true,
      }),
    );
  });

  it('fulfillPaidOrder rechaza órdenes no PAID', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING,
      ticketsGenerated: false,
      invoiceGenerated: false,
    });

    await expect(service.fulfillPaidOrder('order-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('getMine rechaza entradas de otro usuario', async () => {
    ticketRepo.findOne.mockResolvedValue({
      ...validTicketBase,
      userId: 'other',
      qrPayload: 'MCQR-x',
      code: 'TKT-1',
    });

    await expect(service.getMine('user-1', 'tkt-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getTicketPdf regenera el PDF (RN-059)', async () => {
    ticketRepo.findOne.mockResolvedValue({
      ...validTicketBase,
      code: 'TKT-ABC',
      qrPayload: 'MCQR-abc',
    });

    const pdf = await service.getTicketPdf('user-1', 'tkt-1');

    expect(pdf.filename).toBe('TKT-ABC.pdf');
    expect(pdf.buffer.toString()).toContain('%PDF');
    expect(pdfService.buildTicketPdf).toHaveBeenCalled();
  });

  describe('validateQr (HU-024)', () => {
    it('autoriza ingreso y marca USED (RN-102/103/104)', async () => {
      ticketRepo.findOne.mockResolvedValue({ ...validTicketBase });
      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PAID,
      });

      const result = await service.validateQr(
        'staff-1',
        'MCQR-a1b2c3d4e5f6789012345678abcdef01',
      );

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Ingreso autorizado');
      expect(result.ticket.status).toBe(TicketStatus.USED);
      expect(result.ticket.validatedByUserId).toBe('staff-1');
      expect(result.ticket.roomName).toBe('Sala 1');
      expect(result.ticket.seatLabel).toBe('A1');
      expect(result.ticket.usedAt).toBeTruthy();
      expect(updateQb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TicketStatus.USED,
          validatedByUserId: 'staff-1',
        }),
      );
    });

    it('rechaza QR desconocido', async () => {
      ticketRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validateQr('staff-1', 'MCQR-unknown'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('alerta si el QR ya fue utilizado (RN-102)', async () => {
      ticketRepo.findOne.mockResolvedValue({
        ...validTicketBase,
        status: TicketStatus.USED,
        usedAt: new Date('2026-08-01T19:55:00Z'),
        validatedByUserId: 'staff-prev',
      });

      await expect(
        service.validateQr('staff-1', validTicketBase.qrPayload),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'TICKET_ALREADY_USED',
        }),
      });
      expect(updateQb.execute).not.toHaveBeenCalled();
    });

    it('rechaza entrada anulada', async () => {
      ticketRepo.findOne.mockResolvedValue({
        ...validTicketBase,
        status: TicketStatus.CANCELLED,
      });

      await expect(
        service.validateQr('staff-1', validTicketBase.qrPayload),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'TICKET_CANCELLED',
        }),
      });
    });

    it('rechaza si la orden no está PAID', async () => {
      ticketRepo.findOne.mockResolvedValue({ ...validTicketBase });
      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
      });

      await expect(
        service.validateQr('staff-1', validTicketBase.qrPayload),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'ORDER_NOT_PAID',
        }),
      });
    });

    it('trata carrera concurrente como ya utilizado', async () => {
      ticketRepo.findOne
        .mockResolvedValueOnce({ ...validTicketBase })
        .mockResolvedValueOnce({
          ...validTicketBase,
          status: TicketStatus.USED,
          usedAt: new Date('2026-08-01T19:56:00Z'),
          validatedByUserId: 'staff-other',
        });
      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PAID,
      });
      updateQb.execute.mockResolvedValue({ affected: 0 });

      await expect(
        service.validateQr('staff-1', validTicketBase.qrPayload),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'TICKET_ALREADY_USED',
        }),
      });
    });
  });
});
