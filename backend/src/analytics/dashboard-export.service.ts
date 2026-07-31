import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { DashboardResponse } from './dto/dashboard-response';

/**
 * Exportación PDF / Excel (CSV) del dashboard gerencial (HU-025).
 *
 * No persiste archivos: genera el binario bajo demanda a partir del
 * mismo payload JSON de `GET /dashboard`.
 *
 * @remarks
 * **Patrón:** Service auxiliar (Helper).
 * Problema que resuelve: aislar PDFKit y el formato tabular del
 * agregador de KPIs.
 */
@Injectable()
export class DashboardExportService {
  /**
   * PDF ejecutivo con KPIs, tops y comparativo.
   *
   * @param data - Payload del dashboard.
   * @returns Buffer PDF.
   */
  async buildPdf(data: DashboardResponse): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(18)
        .text('Multicine — Dashboard gerencial (KPIs)', { align: 'center' });
      doc.moveDown(0.4);
      doc
        .fontSize(10)
        .fillColor('#444')
        .text(
          `Período: ${data.meta.period} · ${data.meta.from} → ${data.meta.to}`,
          { align: 'center' },
        )
      doc.text(`Generado: ${data.meta.generatedAt}`, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown();

      const { kpis } = data;
      doc.fontSize(13).text('Indicadores clave');
      doc.moveDown(0.3);
      doc.fontSize(10);
      this.line(doc, 'Ingresos (COP)', kpis.revenue.total);
      this.line(doc, 'Órdenes pagadas', kpis.sales.ordersPaid);
      this.line(doc, 'Entradas emitidas', kpis.tickets.issued);
      this.line(doc, 'Ocupación %', kpis.occupation.occupancyPercent);
      this.line(doc, 'Confitería (unidades)', kpis.snacks.itemsSold);
      this.line(doc, 'Cine Flash activaciones', kpis.cineFlash.activations);
      this.line(doc, 'Bonos vendidos', kpis.giftcards.sold);
      this.line(doc, 'Membresías totales', kpis.memberships.total);
      this.line(doc, 'Usuarios con login', kpis.activeUsers.loggedInPeriod);
      this.line(doc, 'Conversión %', kpis.conversion.ratePercent);
      this.line(doc, 'Cancelaciones (órdenes)', kpis.cancellations.orders);
      this.line(doc, 'Transferencias aceptadas', kpis.transfers.accepted);

      doc.moveDown();
      doc.fontSize(13).text('Comparativo vs. período anterior');
      doc.moveDown(0.3);
      doc.fontSize(10);
      this.line(
        doc,
        'Δ Ingresos %',
        data.comparison.deltas.revenuePercent ?? 'n/a',
      );
      this.line(
        doc,
        'Δ Órdenes %',
        data.comparison.deltas.ordersPercent ?? 'n/a',
      );
      this.line(
        doc,
        'Δ Entradas %',
        data.comparison.deltas.ticketsPercent ?? 'n/a',
      );
      this.line(
        doc,
        'Δ Ocupación (pp)',
        data.comparison.deltas.occupancyPoints ?? 'n/a',
      );

      doc.moveDown();
      doc.fontSize(13).text('Top películas (entradas)');
      doc.moveDown(0.3);
      doc.fontSize(10);
      for (const row of data.tops.movies.slice(0, 10)) {
        doc.text(`· ${row.name}: ${row.value}`);
      }

      doc.moveDown();
      doc.fontSize(13).text('Top complejos (ingresos)');
      doc.moveDown(0.3);
      doc.fontSize(10);
      for (const row of data.tops.cinemas.slice(0, 10)) {
        doc.text(`· ${row.name}: ${row.value}`);
      }

      doc.end();
    });
  }

  /**
   * CSV compatible con Excel (UTF-8 BOM).
   *
   * @param data - Payload del dashboard.
   * @returns Texto CSV.
   */
  buildExcelCsv(data: DashboardResponse): string {
    const lines: string[] = [];
    lines.push('section,metric,value');
    lines.push(`meta,period,${data.meta.period}`);
    lines.push(`meta,from,${data.meta.from}`);
    lines.push(`meta,to,${data.meta.to}`);
    lines.push(`meta,generatedAt,${data.meta.generatedAt}`);

    const { kpis } = data;
    const flat: [string, string | number][] = [
      ['sales.ordersPaid', kpis.sales.ordersPaid],
      ['sales.revenue', kpis.sales.revenue],
      ['sales.ticketsRevenue', kpis.sales.ticketsRevenue],
      ['sales.snacksRevenue', kpis.sales.snacksRevenue],
      ['tickets.issued', kpis.tickets.issued],
      ['tickets.used', kpis.tickets.used],
      ['tickets.cancelled', kpis.tickets.cancelled],
      ['occupation.percent', kpis.occupation.occupancyPercent],
      ['snacks.itemsSold', kpis.snacks.itemsSold],
      ['cineFlash.activations', kpis.cineFlash.activations],
      ['giftcards.sold', kpis.giftcards.sold],
      ['memberships.total', kpis.memberships.total],
      ['activeUsers.loggedInPeriod', kpis.activeUsers.loggedInPeriod],
      ['conversion.ratePercent', kpis.conversion.ratePercent],
      ['cancellations.orders', kpis.cancellations.orders],
      ['transfers.accepted', kpis.transfers.accepted],
      ['revenue.total', kpis.revenue.total],
      [
        'comparison.revenuePercent',
        data.comparison.deltas.revenuePercent ?? '',
      ],
    ];

    for (const [metric, value] of flat) {
      lines.push(`kpi,${metric},${value}`);
    }

    lines.push('');
    lines.push('series,bucket,orders,revenue,tickets');
    for (const p of data.series) {
      lines.push(`series,${p.bucket},${p.orders},${p.revenue},${p.tickets}`);
    }

    lines.push('');
    lines.push('top,kind,id,name,value,secondary');
    for (const [kind, rows] of [
      ['movies', data.tops.movies],
      ['cities', data.tops.cities],
      ['cinemas', data.tops.cinemas],
      ['snacks', data.tops.snacks],
    ] as const) {
      for (const r of rows) {
        const name = `"${r.name.replace(/"/g, '""')}"`;
        lines.push(
          `top,${kind},${r.id},${name},${r.value},${r.secondary ?? ''}`,
        );
      }
    }

    /** BOM para que Excel abra UTF-8 correctamente. */
    return `\uFEFF${lines.join('\n')}`;
  }

  private line(
    doc: InstanceType<typeof PDFDocument>,
    label: string,
    value: string | number,
  ): void {
    doc.text(`${label}: ${value}`);
  }
}
