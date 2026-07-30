import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { City } from '../locations/entities/city.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { LocationsModule } from '../locations/locations.module';
import { Genre } from './entities/genre.entity';
import { Movie } from './entities/movie.entity';
import { CastMember } from './entities/cast-member.entity';
import { Room } from './entities/room.entity';
import { Showtime } from './entities/showtime.entity';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { seedMovies } from './movies.seed';

/**
 * Módulo de películas: cartelera (HU-003) + detalle/recomendaciones (HU-004).
 *
 * Importa `LocationsModule` para garantizar que el seed geográfico
 * corra antes (cines necesarios para salas/funciones).
 */
@Module({
  imports: [
    LocationsModule,
    TypeOrmModule.forFeature([
      Movie,
      Genre,
      CastMember,
      Room,
      Showtime,
      City,
      Cinema,
    ]),
  ],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule implements OnModuleInit {
  private readonly logger = new Logger(MoviesModule.name);

  /**
   * @param dataSource - Conexión TypeORM global.
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Hook de Nest: siembra cartelera demo si la DB no tiene películas.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await seedMovies(this.dataSource);
    this.logger.log('Movies seed checked (cartelera/detalle demo if empty)');
  }
}
