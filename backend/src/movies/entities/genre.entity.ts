import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Movie } from './movie.entity';

/**
 * Género cinematográfico (Acción, Comedia, …).
 *
 * Relación N:M con `Movie` vía tabla `movie_genres`.
 */
@Entity('genres')
export class Genre {
  /** UUID del género. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre único del género (ej. "Acción"). */
  @Column({ type: 'varchar', length: 80, unique: true })
  name!: string;

  /** Películas asociadas (lado inverso del ManyToMany). */
  @ManyToMany(() => Movie, (movie) => movie.genres)
  movies!: Movie[];
}
