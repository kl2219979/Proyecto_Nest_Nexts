import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import type { InvoiceLineSnapshot } from './dto/ticket-response';
import type { Invoice } from './entities/invoice.entity';
import type { Ticket } from './entities/ticket.entity';

/**
 * Generador de PDFs de entradas y facturas (HU-014).
 *
 * Regenera el documento cada vez que se descarga (RN-059): no guarda
 * binarios en disco ni en BD; solo usa datos ya persistidos.
 *
 * @remarks
 * **Patrón:** Service auxiliar (Helper) inyectable.
 * Problema que resuelve: aislar la librería PDF/QR del dominio de
 * tickets para que el servicio principal no conozca PDFKit.
 */
@Injectable()
export class DocumentPdfService {
  /** Condiciones estándar impresas en entrada y factura. */
  static readonly DEFAULT_TERMS =
    'Condiciones de uso: la entrada es personal e intransferible salvo ' +
    'proceso de transferencia oficial. El código QR es de un solo uso ' +
    'y se invalida al ingresar a la sala. Presente este documento o el ' +
    'QR digital en el acceso. Multicine se reserva el derecho de admisión ' +
    'según normas del complejo.';

  /**
   * Arma el PDF de una entrada digital con QR embebido.
   *
   * @param ticket - Entrada persistida.
   * @returns Buffer PDF listo para descargar.
   */
  async buildTicketPdf(ticket: Ticket): Promise<Buffer> {
    const qrPng = await QRCode.toBuffer(ticket.qrPayload, {
      type: 'png',
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    const starts = ticket.startsAt.toLocaleString('es-CO', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    });

    return this.renderPdf((doc) => {
      doc.fontSize(18).text('Multicine — Entrada digital', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#444').text(ticket.code, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown();

      doc.fontSize(12).text(`Película: ${ticket.movieTitle}`);
      doc.text(`Fecha y hora: ${starts}`);
      doc.text(`Complejo: ${ticket.cinemaName}`);
      doc.text(`Sala: ${ticket.roomName}`);
      doc.text(`Silla: ${ticket.seatLabel}`);
      doc.text(`Formato: ${ticket.format} · Idioma: ${ticket.language}`);
      doc.text(`Tipo: ${ticket.ticketType}`);
      doc.text(`Comprador: ${ticket.buyerName}`);
      doc.text(`Estado: ${ticket.status}`);
      doc.moveDown();

      doc.image(qrPng, {
        fit: [160, 160],
        align: 'center',
      });
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#666').text(ticket.qrPayload, {
        align: 'center',
      });
      doc.fillColor('#000');
      doc.moveDown();
      doc.fontSize(8).text(DocumentPdfService.DEFAULT_TERMS, {
        align: 'justify',
      });
    });
  }

  /**
   * Arma el PDF de factura / comprobante con resumen de compra.
   *
   * @param invoice - Factura persistida.
   * @param lines - Líneas deserializadas del snapshot.
   * @returns Buffer PDF.
   */
  async buildInvoicePdf(
    invoice: Invoice,
    lines: InvoiceLineSnapshot[],
  ): Promise<Buffer> {
    const issued = invoice.issuedAt.toLocaleString('es-CO', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    });

    return this.renderPdf((doc) => {
      doc.fontSize(18).text('Multicine — Factura electrónica', {
        align: 'center',
      });
      doc.moveDown(0.4);
      doc.fontSize(11).text(`Número: ${invoice.number}`, { align: 'center' });
      doc.fontSize(9).fillColor('#444').text(`Emitida: ${issued}`, {
        align: 'center',
      });
      doc.fillColor('#000');
      doc.moveDown();

      doc.fontSize(11).text(`Cliente: ${invoice.buyerName}`);
      doc.text(`Email: ${invoice.buyerEmail}`);
      if (invoice.cinemaName) {
        doc.text(`Complejo: ${invoice.cinemaName}`);
      }
      doc.moveDown(0.5);

      doc.fontSize(12).text('Detalle');
      doc.moveDown(0.3);
      for (const line of lines) {
        const seat = line.seatLabel ? ` · Silla ${line.seatLabel}` : '';
        doc
          .fontSize(9)
          .text(
            `${line.kind} · ${line.description}${seat} ×${line.quantity} — $${Number(line.lineTotal).toFixed(2)} ${invoice.currency}`,
          );
      }
      doc.moveDown();

      doc.fontSize(10).text(`Subtotal entradas: $${Number(invoice.ticketsSubtotal).toFixed(2)}`);
      doc.text(`Subtotal confitería: $${Number(invoice.snacksSubtotal).toFixed(2)}`);
      doc.text(`Descuento membresía: -$${Number(invoice.membershipDiscount).toFixed(2)}`);
      doc.text(`Descuento promo: -$${Number(invoice.promoDiscount).toFixed(2)}`);
      if (Number(invoice.giftcardAmount) > 0) {
        doc.text(`Giftcard: -$${Number(invoice.giftcardAmount).toFixed(2)}`);
      }
      doc.text(`IVA: $${Number(invoice.tax).toFixed(2)}`);
      doc.fontSize(12).text(
        `Total: $${Number(invoice.total).toFixed(2)} ${invoice.currency}`,
      );
      doc.moveDown();
      doc.fontSize(8).text(invoice.termsText, { align: 'justify' });
    });
  }

  /**
   * Envuelve PDFKit en una Promise con buffer completo.
   *
   * @param draw - Callback que escribe el contenido.
   * @returns Bytes del PDF.
   */
  private renderPdf(
    draw: (doc: PDFKit.PDFDocument) => void,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        draw(doc);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
