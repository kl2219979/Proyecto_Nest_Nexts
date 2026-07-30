import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentAuditEvent } from '../enums/payment.enums';

/**
 * Auditoría inmutable de eventos de pago (HU-013 / RN-055).
 */
@Entity('payment_audits')
@Index(['paymentId'])
@Index(['orderId'])
export class PaymentAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  paymentId!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'varchar', length: 40 })
  event!: PaymentAuditEvent;

  /** Detalle JSON serializado (sin PAN/CVV). */
  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
