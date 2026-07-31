/**
 * Tests de exportación PDF/CSV del dashboard (HU-025).
 */
import { DashboardExportService } from './dashboard-export.service';
import type { DashboardResponse } from './dto/dashboard-response';
import { DashboardPeriod } from './enums/dashboard.enums';

function sampleDashboard(): DashboardResponse {
  return {
    meta: {
      period: DashboardPeriod.MONTHLY,
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T12:00:00.000Z',
      cityId: null,
      cinemaId: null,
      generatedAt: '2026-07-31T12:00:00.000Z',
    },
    kpis: {
      sales: {
        ordersPaid: 2,
        ticketsRevenue: 40000,
        snacksRevenue: 10000,
        giftcardDiscountApplied: 0,
        revenue: 50000,
      },
      tickets: { issued: 4, used: 1, cancelled: 0 },
      occupation: {
        showtimes: 3,
        soldSeats: 10,
        capacity: 100,
        occupancyPercent: 10,
      },
      movies: { withSales: 1, showtimes: 3 },
      snacks: { itemsSold: 2, revenue: 10000 },
      cineFlash: { activations: 1, deactivations: 0, activePromos: 1 },
      giftcards: {
        sold: 1,
        faceValueSold: 50000,
        redeemedFully: 0,
        remainingBalance: 50000,
      },
      memberships: {
        total: 5,
        createdInPeriod: 1,
        byLevel: [{ level: 'BRONZE', count: 5 }],
      },
      activeUsers: {
        registeredInPeriod: 2,
        verifiedActive: 10,
        loggedInPeriod: 4,
      },
      conversion: { paid: 2, failed: 1, cancelled: 0, ratePercent: 66.7 },
      cancellations: { orders: 0, tickets: 0 },
      transfers: { requested: 1, accepted: 1, pending: 0 },
      revenue: {
        total: 50000,
        tickets: 40000,
        snacks: 10000,
        giftcardsFaceValue: 50000,
      },
    },
    series: [
      { bucket: '2026-07-01', orders: 1, revenue: 25000, tickets: 2 },
      { bucket: '2026-07-02', orders: 1, revenue: 25000, tickets: 2 },
    ],
    tops: {
      movies: [
        { id: 'm1', name: 'Demo', value: 4, secondary: 40000 },
      ],
      cities: [
        { id: 'c1', name: 'Medellín', value: 50000, secondary: 2 },
      ],
      cinemas: [
        { id: 'cine1', name: 'Laureles', value: 50000, secondary: 2 },
      ],
      snacks: [
        { id: 's1', name: 'Combo', value: 2, secondary: 10000 },
      ],
    },
    comparison: {
      previousFrom: '2026-06-01T00:00:00.000Z',
      previousTo: '2026-06-30T23:59:59.999Z',
      previous: {
        revenue: 40000,
        ordersPaid: 1,
        ticketsIssued: 2,
        occupancyPercent: 8,
      },
      deltas: {
        revenuePercent: 25,
        ordersPercent: 100,
        ticketsPercent: 100,
        occupancyPoints: 2,
      },
    },
  };
}

describe('DashboardExportService', () => {
  const service = new DashboardExportService();

  it('buildExcelCsv incluye BOM y métricas KPI', () => {
    const csv = service.buildExcelCsv(sampleDashboard());
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('sales.ordersPaid,2');
    expect(csv).toContain('series,2026-07-01,1,25000,2');
    expect(csv).toContain('Demo');
  });

  it('buildPdf genera un buffer PDF', async () => {
    const buffer = await service.buildPdf(sampleDashboard());
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
