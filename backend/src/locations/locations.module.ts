import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Country } from './entities/country.entity';
import { Department } from './entities/department.entity';
import { City } from './entities/city.entity';
import { Cinema } from './entities/cinema.entity';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { UsersLocationController } from './users-location.controller';
import { seedLocations } from './locations.seed';

/**
 * Módulo HU-002: catálogo País → Departamento → Ciudad (+ cines).
 *
 * Al iniciar (`OnModuleInit`) siembra datos de Colombia si la DB está vacía,
 * para que puedas probar los endpoints sin panel admin.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Country, Department, City, Cinema])],
  controllers: [LocationsController, UsersLocationController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule implements OnModuleInit {
  private readonly logger = new Logger(LocationsModule.name);

  /**
   * @param dataSource - Conexión TypeORM global (misma que usa AppModule).
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Hook de Nest: corre una vez cuando el módulo quedó inicializado.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await seedLocations(this.dataSource);
    this.logger.log('Locations seed checked (Colombia demo data if empty)');
  }
}
