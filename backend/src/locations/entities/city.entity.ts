import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { Cinema } from './cinema.entity';

/**
 * Ciudad (nivel 3 de la jerarquía geográfica HU-002).
 *
 * Regla RN-006: para mostrarse en el catálogo debe estar activa
 * y tener al menos un cine activo.
 */
@Entity('cities')
export class City {
  /** UUID de la ciudad. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre de la ciudad (ej. "Medellín"). */
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /**
   * Si es `false`, la ciudad no debe ofrecerse al visitante
   * (validación del backlog: “No permitir ciudades inactivas”).
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** FK al departamento padre. */
  @Column({ type: 'uuid' })
  departmentId!: string;

  @ManyToOne(() => Department, (department) => department.cities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'departmentId' })
  department!: Department;

  /** Complejos de cine ubicados en esta ciudad. */
  @OneToMany(() => Cinema, (cinema) => cinema.city, { cascade: true })
  cinemas!: Cinema[];
}
