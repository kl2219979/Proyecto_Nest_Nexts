import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Cinema } from '../../locations/entities/cinema.entity';
import { Order } from '../../payments/entities/order.entity';
import { PqrsCategory, PqrsStatus } from '../enums/pqrs.enums';
import { PqrsAttachment } from './pqrs-attachment.entity';
import { PqrsComment } from './pqrs-comment.entity';
import { PqrsHistory } from './pqrs-history.entity';

/**
 * Caso PQRS (petición, queja, reclamo, sugerencia o felicitación) — HU-028.
 *
 * El cliente registra y hace seguimiento; el staff asigna y cambia estados.
 * Número consecutivo `ticketNumber` = RN-110; `slaDueAt` = RN-111.
 *
 * @remarks
 * **Patrón:** Entity (Aggregate Root de un caso PQRS).
 * Problema que resuelve: agrupar metadatos, comentarios, adjuntos e historial
 * bajo un identificador de seguimiento legible (`PQRS-YYYY-NNNNNN`).
 */
@Entity('pqrs_cases')
@Index(['userId', 'createdAt'])
@Index(['status', 'slaDueAt'])
@Index(['assignedToUserId', 'status'])
export class PqrsCase {
  /** UUID interno del caso. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Número consecutivo visible (RN-110), ej. `PQRS-2026-000042`.
   * Unique en BD.
   */
  @Column({ type: 'varchar', length: 32, unique: true })
  ticketNumber!: string;

  /** Cliente que abrió el caso. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Categoría (Petición / Queja / Reclamo / Sugerencia / Felicitación). */
  @Column({ type: 'enum', enum: PqrsCategory })
  category!: PqrsCategory;

  /** Asunto breve. */
  @Column({ type: 'varchar', length: 200 })
  subject!: string;

  /** Descripción detallada. */
  @Column({ type: 'varchar', length: 4000 })
  description!: string;

  /** Estado del ciclo de vida. */
  @Column({ type: 'enum', enum: PqrsStatus, default: PqrsStatus.OPEN })
  status!: PqrsStatus;

  /**
   * Colaborador asignado internamente (STAFF+).
   * Null = sin asignar.
   */
  @Column({ type: 'uuid', nullable: true })
  assignedToUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedTo!: User | null;

  /** Snapshot de horas SLA al crear (RN-111). */
  @Column({ type: 'int' })
  slaHours!: number;

  /** Fecha límite calculada al crear: `createdAt + slaHours`. */
  @Column({ type: 'timestamptz' })
  slaDueAt!: Date;

  /** Compra relacionada (opcional). */
  @Column({ type: 'uuid', nullable: true })
  orderId!: string | null;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order!: Order | null;

  /** Complejo relacionado (opcional). */
  @Column({ type: 'uuid', nullable: true })
  cinemaId!: string | null;

  @ManyToOne(() => Cinema, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cinemaId' })
  cinema!: Cinema | null;

  /** Momento de cierre (RESOLVED / CLOSED / CANCELLED). */
  @Column({ type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @OneToMany(() => PqrsComment, (c) => c.pqrsCase)
  comments!: PqrsComment[];

  @OneToMany(() => PqrsAttachment, (a) => a.pqrsCase)
  attachments!: PqrsAttachment[];

  @OneToMany(() => PqrsHistory, (h) => h.pqrsCase)
  history!: PqrsHistory[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
