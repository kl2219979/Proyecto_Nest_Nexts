import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Snack } from './entities/snack.entity';
import { SnacksController } from './snacks.controller';
import { seedSnacks } from './snacks.seed';
import { SnacksService } from './snacks.service';

/**
 * Módulo de confitería (HU-012).
 *
 * - `GET /snacks` — catálogo por categoría / cine
 * - Exporta `SnacksService` para validar stock en el carrito
 */
@Module({
  imports: [TypeOrmModule.forFeature([Snack])],
  controllers: [SnacksController],
  providers: [SnacksService],
  exports: [SnacksService],
})
export class SnacksModule implements OnModuleInit {
  private readonly logger = new Logger(SnacksModule.name);

  /**
   * @param dataSource - Conexión TypeORM (seed).
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Siembra catálogo demo si la tabla está vacía.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await seedSnacks(this.dataSource);
    this.logger.log('Snacks seed checked (catalog + sold-out demo if empty)');
  }
}
