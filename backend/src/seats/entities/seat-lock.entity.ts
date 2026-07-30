import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Showtime } from '../../movies/entities/showtime.entity';
import { SeatLockStatus } from '../enums/seat.enums';
import { Seat } from './seat.entity';

/**
 * Ocupación de una silla en una función (HU-010).
 *
 * - `LOCKED`: bloqueo temporal ~10 min (RN-039); al expirar se libera (RN-040).
 * - `SOLD`: vendida; no vuelve a AVAILABLE sin flujo de pago/reembolso.
 *
 * Unique `(showtimeId, seatId)` evita doble venta a nivel DB (RN-043).
 *
 * @remarks
 * **Patrón:** ocupación optimista con TTL + constraint único.
 * Problema que resuelve: dos usuarios no pueden quedar con la misma
 * silla activa a la vez aunque entren en paralelo.
 */
@Entity('seat_locks')
@Unique(['showtimeId', 'seatId'])
@Index(['userId', 'status'])
@Index(['reservationId'])
@Index(['expiresAt'])
export class SeatLock {
  /** UUID del lock. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Agrupa las sillas de una misma selección.
   * `GET /reservations` y `DELETE .../release-seats` operan por este id.
   */
  @Column({ type: 'uuid' })
  reservationId!: string;

  /** Función (`showtimes.id`). */
  @Column({ type: 'uuid' })
  showtimeId!: string;

  @ManyToOne(() => Showtime, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showtimeId' })
  showtime!: Showtime;

  /** Silla ocupada. */
  @Column({ type: 'uuid' })
  seatId!: string;

  @ManyToOne(() => Seat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatId' })
  seat!: Seat;

  /**
   * Dueño del lock. Nullable solo para filas `SOLD` sembradas
   * (aún no hay ticket/usuario de compra — HU-013/014).
   */
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  /** LOCKED (temporal) o SOLD (definitiva). */
  @Column({ type: 'varchar', length: 20 })
  status!: SeatLockStatus;

  /**
   * Caducidad del bloqueo temporal (RN-039).
   * `null` cuando `status = SOLD`.
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  /** Alta del lock / venta. */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
