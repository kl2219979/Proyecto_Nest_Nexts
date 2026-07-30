import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AudioType, MovieFormat } from '../enums/movie.enums';
import { Movie } from './movie.entity';
import { Room } from './room.entity';

/**
 * Función / horario de proyección (HU-003).
 *
 * Une película + sala + fecha/hora + formato + idioma/audio.
 * RN-010: solo se muestran funciones con `isActive = true`.
 */
@Entity('showtimes')
export class Showtime {
  /** UUID de la función. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Momento de inicio (UTC en DB; el cliente formatea zona local). */
  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  /** Formato de proyección (2D, 3D, IMAX, VIP). */
  @Column({ type: 'varchar', length: 10 })
  format!: MovieFormat;

  /** Código de idioma de audio (ej. "ES", "EN"). */
  @Column({ type: 'varchar', length: 10 })
  language!: string;

  /** Subtitulada o doblada. */
  @Column({ type: 'varchar', length: 20 })
  audioType!: AudioType;

  /**
   * Butacas ya vendidas / reservadas (simplificación HU-003).
   * Agotada cuando `soldSeats >= room.capacity` (RN-011 / RN-015).
   */
  @Column({ type: 'int', default: 0 })
  soldSeats!: number;

  /**
   * Precio de la entrada para esta función (HU-004).
   * En el detalle se agrega por formato (`pricesByFormat`).
   * Precios dinámicos más ricos llegan en HU-009.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  /** Solo funciones activas entran a cartelera (RN-010). */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** FK a la película. */
  @Column({ type: 'uuid' })
  movieId!: string;

  @ManyToOne(() => Movie, (movie) => movie.showtimes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movieId' })
  movie!: Movie;

  /** FK a la sala (y, transitivamente, al complejo/ciudad). */
  @Column({ type: 'uuid' })
  roomId!: string;

  @ManyToOne(() => Room, (room) => room.showtimes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room!: Room;
}
