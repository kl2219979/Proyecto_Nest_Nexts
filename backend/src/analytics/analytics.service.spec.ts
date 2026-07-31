/**
 * Tests unitarios de `AnalyticsService` (HU-025).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoginAudit } from '../auth/entities/login-audit.entity';
import { User } from '../auth/entities/user.entity';
import { CineFlashAudit } from '../cineflash/entities/cineflash-audit.entity';
import { Giftcard } from '../giftcards/entities/giftcard.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { Membership } from '../membership/entities/membership.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { Order } from '../payments/entities/order.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketTransfer } from '../transfer/entities/ticket-transfer.entity';
import { AnalyticsService } from './analytics.service';
import { DashboardPeriod } from './enums/dashboard.enums';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const emptyQb = () => {
    const qb: Record<string, jest.Mock> = {};
    const chain = new Proxy(qb, {
      get(target, prop: string) {
        if (prop === 'getRawOne') {
          return jest.fn().mockResolvedValue(null);
        }
        if (prop === 'getRawMany') {
          return jest.fn().mockResolvedValue([]);
        }
        if (prop === 'getCount') {
          return jest.fn().mockResolvedValue(0);
        }
        if (prop === 'getMany') {
          return jest.fn().mockResolvedValue([]);
        }
        if (!(prop in target)) {
          target[prop] = jest.fn().mockReturnValue(chain);
        }
        return target[prop];
      },
    });
    return chain;
  };

  const repoStub = () => ({
    createQueryBuilder: jest.fn(() => emptyQb()),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    manager: {
      query: jest.fn().mockResolvedValue([]),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(Order), useValue: repoStub() },
        { provide: getRepositoryToken(Ticket), useValue: repoStub() },
        { provide: getRepositoryToken(Showtime), useValue: repoStub() },
        { provide: getRepositoryToken(Cinema), useValue: repoStub() },
        { provide: getRepositoryToken(User), useValue: repoStub() },
        { provide: getRepositoryToken(LoginAudit), useValue: repoStub() },
        { provide: getRepositoryToken(Membership), useValue: repoStub() },
        { provide: getRepositoryToken(Giftcard), useValue: repoStub() },
        { provide: getRepositoryToken(TicketTransfer), useValue: repoStub() },
        { provide: getRepositoryToken(CineFlashAudit), useValue: repoStub() },
        { provide: getRepositoryToken(Promotion), useValue: repoStub() },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('resolveRange(monthly) arranca el día 1 del mes UTC', () => {
    const range = service.resolveRange(DashboardPeriod.MONTHLY);
    expect(range.from.getUTCDate()).toBe(1);
    expect(range.from.getUTCHours()).toBe(0);
    expect(range.previousTo.getTime()).toBeLessThan(range.from.getTime());
    expect(range.to.getTime()).toBeGreaterThanOrEqual(range.from.getTime());
  });

  it('resolveRange respeta from/to explícitos y calcula ventana previa', () => {
    const range = service.resolveRange(
      DashboardPeriod.DAILY,
      '2026-07-10',
      '2026-07-12',
    );
    expect(range.from.toISOString().startsWith('2026-07-10')).toBe(true);
    expect(range.to.toISOString().startsWith('2026-07-12')).toBe(true);
    const duration = range.to.getTime() - range.from.getTime();
    const prevDuration =
      range.previousTo.getTime() - range.previousFrom.getTime();
    expect(prevDuration).toBe(duration);
  });

  it('getDashboard arma meta + bloques KPI con repos vacíos', async () => {
    const dash = await service.getDashboard({
      period: DashboardPeriod.WEEKLY,
      limit: 5,
    });

    expect(dash.meta.period).toBe(DashboardPeriod.WEEKLY);
    expect(dash.kpis.sales.ordersPaid).toBe(0);
    expect(dash.kpis.conversion.ratePercent).toBe(0);
    expect(dash.tops.movies).toEqual([]);
    expect(dash.series).toEqual([]);
    expect(dash.comparison.previous).toBeDefined();
  });
});
