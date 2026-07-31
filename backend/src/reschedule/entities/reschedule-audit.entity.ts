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
import { Order } from '../../payments/entities/order.entity';

/**
 * Auditoría de cambio de función (HU-016 / RN-070).
 *
 * Cada reprogramación exitosa deja un registro inmutable con
 * función/sillas anteriores y nuevas, más el ajuste económico.
 *
 * @remarks
 * **Patrón:** Audit Log.
 * Problema que resuelve: trazabilidad de invalidación de QR y
 * regeneración sin reescribir el historial de pagos.
 */
@Entity('reschedule_audits')
@Index(['orderId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class RescheduleAudit {
  /** UUID del evento de auditoría. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Orden PAID que conserva su id (RN-069). */
  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  /** Usuario que solicitó el cambio. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  oldShowtimeId!: string;

  @Column({ type: 'uuid' })
  newShowtimeId!: string;

  /** Snapshot JSON de sillas/QR anulados. */
  @Column({ type: 'text' })
  oldSnapshotJson!: string;

  /** Snapshot JSON de sillas/QR nuevos. */
  @Column({ type: 'text' })
  newSnapshotJson!: string;

  /**
   * Diferencia económica (nueva − anterior) sobre subtotal de entradas.
   * Negativo = saldo a favor; positivo = excedente.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  priceDifference!: number;

  /** Monto acreditado en billetera (si diferencia &lt; 0). */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditApplied!: number;

  /** Excedente registrado (si diferencia &gt; 0). */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  surchargeAmount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
