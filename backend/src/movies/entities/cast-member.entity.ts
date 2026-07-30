import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Movie } from './movie.entity';

/**
 * Actor / actriz principal de una película (HU-004).
 *
 * Tabla separada (no JSON) para poder ordenar el elenco
 * y extender campos (personaje, foto) en HUs futuras sin migrar blobs.
 */
@Entity('cast_members')
export class CastMember {
  /** UUID del miembro del elenco. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre artístico. */
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  /** Personaje o rol (opcional). */
  @Column({ type: 'varchar', length: 160, nullable: true })
  role!: string | null;

  /** Orden de aparición en la ficha (menor = más destacado). */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  /** FK a la película. */
  @Column({ type: 'uuid' })
  movieId!: string;

  @ManyToOne(() => Movie, (movie) => movie.castMembers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'movieId' })
  movie!: Movie;
}
