import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Country } from './country.entity';
import { City } from './city.entity';

/**
 * Departamento / Estado (nivel 2 de la jerarquía geográfica HU-002).
 *
 * Ejemplo: Antioquia pertenece a Colombia.
 */
@Entity('departments')
export class Department {
  /** UUID del departamento. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre del departamento (ej. "Antioquia"). */
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** FK al país padre (columna física en la tabla). */
  @Column({ type: 'uuid' })
  countryId!: string;

  /**
   * Relación N:1 hacia Country.
   * `@JoinColumn` indica que esta tabla guarda la FK `countryId`.
   */
  @ManyToOne(() => Country, (country) => country.departments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'countryId' })
  country!: Country;

  /** Ciudades que pertenecen a este departamento. */
  @OneToMany(() => City, (city) => city.department, { cascade: true })
  cities!: City[];
}
