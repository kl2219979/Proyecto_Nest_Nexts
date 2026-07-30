import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Room } from '../../movies/entities/room.entity';
import { SeatType } from '../enums/seat.enums';

/**
 * Silla física de una sala (HU-010).
 *
 * El plano es por `Room`; el estado por función se calcula cruzando
 * esta entidad con `SeatLock` (locks temporales y ventas).
 *
 * @remarks
 * **Incremental:** solo campos necesarios para el mapa interactivo.
 * CRUD admin de distribución llega en HU-020.
 */
@Entity('seats')
@Unique(['roomId', 'rowLabel', 'seatNumber'])
@Index(['roomId'])
export class Seat {
  /** UUID de la silla. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Fila visible (ej. "A", "B"). */
  @Column({ type: 'varchar', length: 8 })
  rowLabel!: string;

  /** Número dentro de la fila (1-based). */
  @Column({ type: 'int' })
  seatNumber!: number;

  /**
   * Columna 0-based en el grid (para alinear pasillos en UI).
   * El frontend usa `rowLabel` + `seatNumber` para etiquetas.
   */
  @Column({ type: 'int' })
  gridColumn!: number;

  /** Fila 0-based en el grid. */
  @Column({ type: 'int' })
  gridRow!: number;

  /** Etiqueta corta (ej. "A12"). */
  @Column({ type: 'varchar', length: 16 })
  label!: string;

  /** Tipo físico (STANDARD / VIP / PREFERENTIAL / DISABLED). */
  @Column({ type: 'varchar', length: 20 })
  seatType!: SeatType;

  /** FK a la sala. */
  @Column({ type: 'uuid' })
  roomId!: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room!: Room;
}
