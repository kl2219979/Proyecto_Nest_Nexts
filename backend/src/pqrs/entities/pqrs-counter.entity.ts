import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Contador anual para el consecutivo de PQRS (RN-110).
 *
 * Una fila por año (`year` PK). Se actualiza dentro de una transacción
 * con `pessimistic_write` para evitar números duplicados bajo concurrencia.
 *
 * @remarks
 * **Patrón:** Sequence table (contador persistente).
 * Problema que resuelve: generar `PQRS-YYYY-NNNNNN` únicos sin depender
 * de `MAX(ticketNumber)` ni de secuencias Postgres por año.
 */
@Entity('pqrs_counters')
export class PqrsCounter {
  /** Año civil del consecutivo (ej. 2026). */
  @PrimaryColumn({ type: 'int' })
  year!: number;

  /** Último número asignado en ese año (0 = ninguno). */
  @Column({ type: 'int', default: 0 })
  lastNumber!: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
