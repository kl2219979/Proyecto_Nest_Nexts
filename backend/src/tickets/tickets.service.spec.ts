/**
 * Tests unitarios de `TicketsService` (HU-014).
 */
import { ConflictException, ForbiddenException } from '@nestjs/common';
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
    createQueryBuilder: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();
    ticketRepo.findOne.mockResolvedValue(null);
    invoiceRepo.findOne.mockResolvedValue(null);

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
      id: 'tkt-1',
      userId: 'other',
      orderId: 'order-1',
      code: 'TKT-1',
      qrPayload: 'MCQR-x',
      status: TicketStatus.VALID,
      ticketType: 'STANDARD',
      movieTitle: 'Demo',
      startsAt: new Date(),
      cinemaName: 'Laureles',
      roomName: 'Sala 1',
      seatLabel: 'A1',
      format: '2D',
      language: 'ESP',
      buyerName: 'Otro',
      usedAt: null,
      createdAt: new Date(),
    });

    await expect(service.getMine('user-1', 'tkt-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getTicketPdf regenera el PDF (RN-059)', async () => {
    ticketRepo.findOne.mockResolvedValue({
      id: 'tkt-1',
      userId: 'user-1',
      orderId: 'order-1',
      code: 'TKT-ABC',
      qrPayload: 'MCQR-abc',
      status: TicketStatus.VALID,
      ticketType: 'STANDARD',
      movieTitle: 'Demo',
      startsAt: new Date(),
      cinemaName: 'Laureles',
      roomName: 'Sala 1',
      seatLabel: 'A1',
      format: '2D',
      language: 'ESP',
      buyerName: 'Ana Pérez',
      usedAt: null,
      createdAt: new Date(),
    });

    const pdf = await service.getTicketPdf('user-1', 'tkt-1');

    expect(pdf.filename).toBe('TKT-ABC.pdf');
    expect(pdf.buffer.toString()).toContain('%PDF');
    expect(pdfService.buildTicketPdf).toHaveBeenCalled();
  });
});
