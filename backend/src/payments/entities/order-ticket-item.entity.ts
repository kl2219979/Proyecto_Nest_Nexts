import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

/**
 * Línea de entrada inmutable en la orden (HU-013).
 */
@Entity('order_ticket_items')
export class OrderTicketItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({ type: 'uuid' })
  seatId!: string;

  @Column({ type: 'varchar', length: 16 })
  seatLabel!: string;

  @Column({ type: 'uuid' })
  movieId!: string;

  @Column({ type: 'varchar', length: 200 })
  movieTitle!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'varchar', length: 80 })
  roomName!: string;

  @Column({ type: 'varchar', length: 120 })
  cinemaName!: string;

  @Column({ type: 'varchar', length: 20 })
  format!: string;

  @Column({ type: 'varchar', length: 40 })
  language!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  membershipDiscount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  lineTotal!: number;
}
