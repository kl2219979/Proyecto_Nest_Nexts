import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { City } from './city.entity';

/**
 * Complejo de cine (multiplex) asociado a una ciudad.
 *
 * En HU-002 aún no hay cartelera; el cine existe para cumplir RN-006
 * (“la ciudad debe tener al menos un cine activo”).
 */
@Entity('cinemas')
export class Cinema {
  /** UUID del complejo. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre comercial (ej. "Multicine Laureles"). */
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  /** Dirección legible para el visitante. */
  @Column({ type: 'varchar', length: 255 })
  address!: string;

  /**
   * Solo los cines activos cuentan para habilitar una ciudad
   * en el selector geográfico.
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** FK a la ciudad. */
  @Column({ type: 'uuid' })
  cityId!: string;

  @ManyToOne(() => City, (city) => city.cinemas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cityId' })
  city!: City;
}
