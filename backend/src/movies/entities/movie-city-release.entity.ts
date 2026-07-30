import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Cinema } from '../../locations/entities/cinema.entity';
import { City } from '../../locations/entities/city.entity';
import { Movie } from './movie.entity';

/**
 * Fecha de estreno de una película por ciudad / complejo (HU-005 / RN-018).
 *
 * Si `cinemaId` es `null`, la fecha aplica a toda la ciudad.
 * Si tiene valor, es la fecha específica de ese complejo.
 *
 * @remarks
 * Patrón: Association entity (tabla puente con atributos).
 * Problema que resuelve: el mismo título puede estrenar en fechas distintas
 * según ciudad o multiplex, sin duplicar la fila de `movies`.
 */
@Entity('movie_city_releases')
@Unique('uq_movie_city_cinema_release', ['movieId', 'cityId', 'cinemaId'])
export class MovieCityRelease {
  /** UUID del registro de estreno. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Película en estado próximo estreno (o recién promovida). */
  @Column({ type: 'uuid' })
  movieId!: string;

  @ManyToOne(() => Movie, (movie) => movie.cityReleases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'movieId' })
  movie!: Movie;

  /** Ciudad donde aplica la fecha. */
  @Column({ type: 'uuid' })
  cityId!: string;

  @ManyToOne(() => City, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cityId' })
  city!: City;

  /**
   * Complejo opcional (RN-018).
   * `null` = fecha a nivel ciudad.
   */
  @Column({ type: 'uuid', nullable: true })
  cinemaId!: string | null;

  @ManyToOne(() => Cinema, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'cinemaId' })
  cinema!: Cinema | null;

  /** Día de estreno estimado (YYYY-MM-DD en columna `date`). */
  @Column({ type: 'date' })
  releaseDate!: string;
}
