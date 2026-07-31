import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CineflashModule } from '../cineflash/cineflash.module';
import { City } from '../locations/entities/city.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { LocationsModule } from '../locations/locations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { Genre } from './entities/genre.entity';
import { Movie } from './entities/movie.entity';
import { CastMember } from './entities/cast-member.entity';
import { MovieCityRelease } from './entities/movie-city-release.entity';
import { Room } from './entities/room.entity';
import { Showtime } from './entities/showtime.entity';
import { FunctionsController } from './functions.controller';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { ShowtimesService } from './showtimes.service';
import { seedMovies } from './movies.seed';

/**
 * Módulo de películas: cartelera (HU-003) + detalle (HU-004) + estrenos (HU-005)
 * + selección de función/precios (HU-009) + listado Cine Flash (HU-019).
 *
 * Importa `LocationsModule` (seed geo), `NotificationsModule` (RN-020)
 * y `CineflashModule` (`GET /movies/cineflash`).
 */
@Module({
  imports: [
    LocationsModule,
    NotificationsModule,
    PromotionsModule,
    CineflashModule,
    TypeOrmModule.forFeature([
      Movie,
      Genre,
      CastMember,
      MovieCityRelease,
      Room,
      Showtime,
      City,
      Cinema,
    ]),
  ],
  controllers: [MoviesController, FunctionsController],
  providers: [MoviesService, ShowtimesService],
  exports: [MoviesService, ShowtimesService],
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
   * Hook de Nest: siembra cartelera + próximos estrenos demo si la DB está vacía.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await seedMovies(this.dataSource);
    this.logger.log(
      'Movies seed checked (cartelera/detalle/estrenos demo if empty)',
    );
  }
}
