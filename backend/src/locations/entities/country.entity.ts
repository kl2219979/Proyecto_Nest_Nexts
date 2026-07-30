import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from './department.entity';

/**
 * País (nivel 1 de la jerarquía geográfica HU-002).
 *
 * Ejemplo: Colombia (`code: "CO"`).
 * Un país tiene muchos departamentos.
 */
@Entity('countries')
export class Country {
  /**
   * Identificador único generado por Postgres (UUID v4).
   * El frontend y las rutas usan este `id`, no el nombre.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre legible del país (ej. "Colombia"). */
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /**
   * Código ISO corto (ej. "CO").
   * Útil para banderas, i18n o integraciones futuras.
   */
  @Column({ type: 'varchar', length: 3, unique: true })
  code!: string;

  /**
   * Relación 1:N con departamentos.
   * `cascade` facilita el seed: al guardar el país se pueden guardar hijos.
   */
  @OneToMany(() => Department, (department) => department.country, {
    cascade: true,
  })
  departments!: Department[];
}
