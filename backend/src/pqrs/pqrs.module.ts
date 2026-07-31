import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Order } from '../payments/entities/order.entity';
import { PqrsAttachment } from './entities/pqrs-attachment.entity';
import { PqrsCase } from './entities/pqrs-case.entity';
import { PqrsComment } from './entities/pqrs-comment.entity';
import { PqrsCounter } from './entities/pqrs-counter.entity';
import { PqrsHistory } from './entities/pqrs-history.entity';
import { PqrsSlaConfig } from './entities/pqrs-sla-config.entity';
import { PqrsController } from './pqrs.controller';
import { seedPqrsSlaConfigs } from './pqrs.seed';
import { PqrsService } from './pqrs.service';

/**
 * PQRS integrado (HU-028).
 *
 * - Alta / seguimiento / estados / asignación interna
 * - RN-110 consecutivo · RN-111 SLA · RN-112 notificaciones email
 * - Adjuntos como URL (CDN); comentarios + historial
 */
@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      PqrsCase,
      PqrsComment,
      PqrsAttachment,
      PqrsHistory,
      PqrsSlaConfig,
      PqrsCounter,
      User,
      Order,
      Cinema,
    ]),
  ],
  controllers: [PqrsController],
  providers: [PqrsService],
  exports: [PqrsService],
})
export class PqrsModule implements OnModuleInit {
  private readonly logger = new Logger(PqrsModule.name);

  /**
   * @param slaRepo - Seed de SLA por categoría.
   */
  constructor(
    @InjectRepository(PqrsSlaConfig)
    private readonly slaRepo: Repository<PqrsSlaConfig>,
  ) {}

  /**
   * Garantiza filas SLA (RN-111) al arrancar.
   */
  async onModuleInit(): Promise<void> {
    await seedPqrsSlaConfigs(this.slaRepo);
    this.logger.log('PQRS SLA configs checked (RN-111)');
  }
}
