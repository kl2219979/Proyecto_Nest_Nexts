import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

/**
 * Línea de confitería inmutable en la orden (HU-013).
 * El stock se descuenta solo tras pago APPROVED (RN-052).
 */
@Entity('order_snack_items')
export class OrderSnackItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.snacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({ type: 'uuid' })
  snackId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  membershipDiscount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  lineTotal!: number;
}
