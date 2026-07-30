import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SeatLockAuditAction } from '../enums/seat.enums';

/**
 * Auditoría de bloqueos y liberaciones de sillas (HU-010 seguridad).
 *
 * No participa en el cálculo de disponibilidad; solo deja rastro
 * de quién bloqueó / liberó / expiró cada silla.
 */
@Entity('seat_lock_audits')
@Index(['showtimeId', 'createdAt'])
@Index(['reservationId'])
export class SeatLockAudit {
  /** UUID del evento. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Función afectada. */
  @Column({ type: 'uuid' })
  showtimeId!: string;

  /** Silla afectada. */
  @Column({ type: 'uuid' })
  seatId!: string;

  /** Usuario que originó la acción (`null` en EXPIREs automáticos). */
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  /** Grupo de reserva asociado. */
  @Column({ type: 'uuid', nullable: true })
  reservationId!: string | null;

  /** LOCK | RELEASE | EXPIRE. */
  @Column({ type: 'varchar', length: 20 })
  action!: SeatLockAuditAction;

  /** Momento del evento. */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
