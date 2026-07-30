import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CastMember } from './cast-member.entity';
import { Genre } from './genre.entity';
import { Showtime } from './showtime.entity';

/**
 * Película del catálogo (HU-003 + HU-004).
 *
 * HU-003 usa los campos de tarjeta (póster, géneros, rating…).
 * HU-004 añade ficha completa: banner, tráiler, sinopsis, elenco, estreno.
 */
@Entity('movies')
export class Movie {
  /** UUID de la película. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Título comercial. */
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  /** URL del póster oficial (el frontend lo renderiza). */
  @Column({ type: 'varchar', length: 500 })
  posterUrl!: string;

  /**
   * Banner / imagen hero de la página de detalle (HU-004).
   * Nullable para películas sembradas antes de esta HU.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  bannerUrl!: string | null;

  /**
   * URL del tráiler en YouTube (HU-004 / RN-016).
   * El backend solo expone la URL; el embed lo hace el frontend.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  trailerUrl!: string | null;

  /** Sinopsis completa para la ficha de detalle. */
  @Column({ type: 'text', nullable: true })
  synopsis!: string | null;

  /**
   * Fecha de estreno (solo día; sin hora).
   * Puede variar por ciudad en HU-005; aquí es la fecha de catálogo.
   */
  @Column({ type: 'date', nullable: true })
  releaseDate!: string | null;

  /**
   * Clasificación etaria (ej. "T", "7+", "12+", "15+", "18+").
   * Se filtra con el query param `classification`.
   */
  @Column({ type: 'varchar', length: 10 })
  classification!: string;

  /** Duración en minutos. */
  @Column({ type: 'int' })
  durationMinutes!: number;

  /** Nombre del director. */
  @Column({ type: 'varchar', length: 160 })
  director!: string;

  /**
   * Calificación promedio del público (0–10).
   */
  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating!: number;

  /** Indicador de estreno para la tarjeta de cartelera. */
  @Column({ type: 'boolean', default: false })
  isPremiere!: boolean;

  /** Si es `false`, no debe listarse en cartelera ni detalle público. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Géneros de la película.
   *
   * @remarks
   * Patrón: Association (ManyToMany) vía `JoinTable`.
   * Problema que resuelve: una película tiene varios géneros y un género
   * aplica a varias películas, sin duplicar filas.
   */
  @ManyToMany(() => Genre, (genre) => genre.movies, { cascade: true })
  @JoinTable({ name: 'movie_genres' })
  genres!: Genre[];

  /** Elenco principal (HU-004). */
  @OneToMany(() => CastMember, (member) => member.movie, { cascade: true })
  castMembers!: CastMember[];

  /** Funciones programadas de esta película. */
  @OneToMany(() => Showtime, (showtime) => showtime.movie)
  showtimes!: Showtime[];
}
