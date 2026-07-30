import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { City } from '../../locations/entities/city.entity';
import { Movie } from '../../movies/entities/movie.entity';

/**
 * Estado del aviso de estreno (HU-005 / RN-020).
 *
 * El envío real de correo es HU-015; aquí se registra la intención
 * y se marca `SENT` cuando la película pasa a cartelera.
 */
export enum UpcomingNotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
}

/**
 * Solicitud “Notificarme cuando esté disponible” (HU-005).
 *
 * Unicidad `(userId, movieId)` → RN-019 (sin duplicados).
 *
 * @remarks
 * Sin JWT aún (HU-006/007): el cliente envía `userId` + `email`
 * provisionalmente. Cuando exista auth, se tomarán del token.
 */
@Entity('upcoming_notifications')
@Unique('uq_upcoming_user_movie', ['userId', 'movieId'])
export class UpcomingNotification {
  /** UUID de la solicitud. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Identificador del usuario autenticado (o provisional hasta HU-007).
   * No hay tabla `users` todavía: se valida como UUID.
   */
  @Column({ type: 'uuid' })
  userId!: string;

  /** Correo donde se enviará el aviso (HU-015 consumirá este campo). */
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /** Película de próximo estreno. */
  @Column({ type: 'uuid' })
  movieId!: string;

  @ManyToOne(() => Movie, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movieId' })
  movie!: Movie;

  /** Ciudad de contexto: el aviso es “cuando llegue a mi ciudad”. */
  @Column({ type: 'uuid' })
  cityId!: string;

  @ManyToOne(() => City, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cityId' })
  city!: City;

  /** PENDING hasta que la película pase a `NOW_SHOWING`. */
  @Column({
    type: 'enum',
    enum: UpcomingNotificationStatus,
    default: UpcomingNotificationStatus.PENDING,
  })
  status!: UpcomingNotificationStatus;

  /** Momento en que se disparó el aviso (RN-020). */
  @Column({ type: 'timestamptz', nullable: true })
  notifiedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
