import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Order } from '../payments/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Survey } from './entities/survey.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

/**
 * Encuestas de satisfacción post-visita (HU-027).
 *
 * - `POST /surveys` · `GET /surveys` · `GET /surveys/:id`
 * - RN-108 solo asistentes (ticket USED) · RN-109 una por compra
 *
 * Reusa `Order` y `Ticket` sin importar Payments/Tickets modules
 * (solo entidades TypeORM → evita ciclos).
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Survey, Order, Ticket]),
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
