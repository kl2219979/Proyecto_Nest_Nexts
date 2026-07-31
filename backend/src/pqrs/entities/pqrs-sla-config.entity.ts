import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PqrsCategory } from '../enums/pqrs.enums';

/**
 * SLA configurable por categoría (HU-028 / RN-111).
 *
 * Al crear un caso se toma un *snapshot* de `hours` en el caso
 * (`slaHours` / `slaDueAt`) para no cambiar plazos ya prometidos.
 *
 * @remarks
 * **Patrón:** Entity (configuración de dominio).
 * Problema que resuelve: permitir ajustar plazos sin redeploy ni hardcode.
 */
@Entity('pqrs_sla_configs')
export class PqrsSlaConfig {
  /** Categoría PQRS (PK). */
  @PrimaryColumn({ type: 'enum', enum: PqrsCategory })
  category!: PqrsCategory;

  /** Horas límite para respuesta / resolución. */
  @Column({ type: 'int' })
  hours!: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
