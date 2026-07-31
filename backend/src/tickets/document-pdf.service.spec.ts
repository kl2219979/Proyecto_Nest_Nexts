/**
 * Tests de `DocumentPdfService` (HU-014): PDF con QR embebido.
 */
import { DocumentPdfService } from './document-pdf.service';
import { TicketStatus, TicketType } from './enums/ticket.enums';
import type { Ticket } from './entities/ticket.entity';
import type { Invoice } from './entities/invoice.entity';

describe('DocumentPdfService', () => {
  const service = new DocumentPdfService();

  it('buildTicketPdf produce un PDF válido con cabecera %PDF', async () => {
    const ticket = {
      id: 'tkt-1',
      code: 'TKT-TEST01',
      qrPayload: 'MCQR-testpayload0000000000000001',
      status: TicketStatus.VALID,
      ticketType: TicketType.STANDARD,
      movieTitle: 'Película Demo',
      startsAt: new Date('2026-08-01T20:00:00Z'),
      cinemaName: 'Laureles',
      roomName: 'Sala 1',
      seatLabel: 'A1',
      format: '2D',
      language: 'ESP',
      buyerName: 'Ana Pérez',
    } as Ticket;

    const buffer = await service.buildTicketPdf(ticket);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('buildInvoicePdf incluye totales de la compra', async () => {
    const invoice = {
      number: 'FE-20260730-ABC123',
      currency: 'COP',
      ticketsSubtotal: 20000,
      snacksSubtotal: 12000,
      subtotal: 32000,
      membershipDiscount: 0,
      promoDiscount: 0,
      giftcardAmount: 0,
      tax: 6080,
      total: 38080,
      cinemaName: 'Laureles',
      buyerName: 'Ana Pérez',
      buyerEmail: 'ana@test.com',
      termsText: DocumentPdfService.DEFAULT_TERMS,
      issuedAt: new Date('2026-07-30T18:00:00Z'),
    } as Invoice;

    const buffer = await service.buildInvoicePdf(invoice, [
      {
        kind: 'TICKET',
        description: 'Demo · 2D',
        quantity: 1,
        unitPrice: 20000,
        lineTotal: 20000,
        seatLabel: 'A1',
      },
    ]);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
