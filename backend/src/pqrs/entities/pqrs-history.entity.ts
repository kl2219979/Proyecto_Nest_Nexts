import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PqrsHistoryEvent } from '../enums/pqrs.enums';
import { PqrsCase } from './pqrs-case.entity';

/**
 * Entrada de historial / auditoría de un caso PQRS (HU-028).
 *
 * Permite al cliente y al staff ver el seguimiento (creación, cambios de
 * estado, asignación, comentarios, adjuntos).
 */
@Entity('pqrs_history')
@Index(['pqrsId', 'createdAt'])
export class PqrsHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pqrsId!: string;

  @ManyToOne(() => PqrsCase, (c) => c.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pqrsId' })
  pqrsCase!: PqrsCase;

  @Column({ type: 'enum', enum: PqrsHistoryEvent })
  event!: PqrsHistoryEvent;

  /** Quién provocó el evento (null si sistema). */
  @Column({ type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorUserId' })
  actor!: User | null;

  /** Mensaje legible del cambio. */
  @Column({ type: 'varchar', length: 500 })
  message!: string;

  /** Detalle opcional (JSON serializado: from/to status, etc.). */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
