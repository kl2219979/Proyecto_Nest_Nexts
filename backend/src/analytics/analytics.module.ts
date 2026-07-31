import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
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
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DashboardExportService } from './dashboard-export.service';

/**
 * Analytics / dashboard gerencial de KPIs (HU-025).
 *
 * - `GET /dashboard` — agregados en tiempo real
 * - `GET /dashboard/export.pdf` · `GET /dashboard/export.xlsx`
 * - Filtros: period (daily|weekly|monthly|yearly), from/to, cityId, cinemaId
 *
 * Autorización: ADMIN+ (JWT + RolesGuard). Independiente de los reportes
 * operativos de HU-020 (`/api/admin/reports/*`).
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Order,
      Ticket,
      Showtime,
      Cinema,
      User,
      LoginAudit,
      Membership,
      Giftcard,
      TicketTransfer,
      CineFlashAudit,
      Promotion,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, DashboardExportService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
