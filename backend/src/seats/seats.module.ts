import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/jwt/optional-jwt-auth.guard';
import { Showtime } from '../movies/entities/showtime.entity';
import { MoviesModule } from '../movies/movies.module';
import { SeatLockAudit } from './entities/seat-lock-audit.entity';
import { SeatLock } from './entities/seat-lock.entity';
import { Seat } from './entities/seat.entity';
import { FunctionSeatsController } from './function-seats.controller';
import { ReservationsController } from './reservations.controller';
import { seedSeats } from './seats.seed';
import { SeatsService } from './seats.service';

/**
 * Módulo de sillas y reservas temporales (HU-010).
 *
 * Endpoints:
 * - `GET|POST /functions/:id/seats`
 * - `GET /reservations` · `DELETE /reservations/release-seats`
 *
 * Depende de `MoviesModule` (showtimes/rooms) y `AuthModule` (JWT).
 */
@Module({
  imports: [
    AuthModule,
    MoviesModule,
    TypeOrmModule.forFeature([Seat, SeatLock, SeatLockAudit, Showtime]),
  ],
  controllers: [FunctionSeatsController, ReservationsController],
  providers: [SeatsService, OptionalJwtAuthGuard],
  /** `SeatsService` lo consume el carrito (HU-011) para TTL y release. */
  exports: [SeatsService],
})
export class SeatsModule implements OnModuleInit {
  private readonly logger = new Logger(SeatsModule.name);

  /**
   * @param dataSource - Conexión TypeORM (seed tras cartelera).
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Siembra planos de sillas si la tabla está vacía.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await seedSeats(this.dataSource);
    this.logger.log('Seats seed checked (room layouts + sold demo if empty)');
  }
}
