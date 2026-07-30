import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cinema } from '../../locations/entities/cinema.entity';
import { RoomType } from '../enums/movie.enums';
import { Showtime } from './showtime.entity';

/**
 * Sala de un complejo de cine (HU-003).
 *
 * Necesaria para filtrar por “tipo de sala” y para anclar funciones
 * a un complejo concreto (`cinemaId` vía la sala).
 */
@Entity('rooms')
export class Room {
  /** UUID de la sala. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre visible (ej. "Sala 1", "IMAX 1"). */
  @Column({ type: 'varchar', length: 80 })
  name!: string;

  /** Tipo de sala para el filtro del backlog. */
  @Column({ type: 'varchar', length: 20 })
  roomType!: RoomType;

  /**
   * Capacidad total de butacas.
   * En HU-003 sirve para calcular “agotada” (RN-011);
   * el mapa de sillas llega en HU-010.
   */
  @Column({ type: 'int' })
  capacity!: number;

  /** FK al complejo. */
  @Column({ type: 'uuid' })
  cinemaId!: string;

  @ManyToOne(() => Cinema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cinemaId' })
  cinema!: Cinema;

  /** Funciones programadas en esta sala. */
  @OneToMany(() => Showtime, (showtime) => showtime.room)
  showtimes!: Showtime[];
}
