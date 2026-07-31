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
import { OrderStatus } from '../enums/payment.enums';
import { OrderSnackItem } from './order-snack-item.entity';
import { OrderTicketItem } from './order-ticket-item.entity';

/**
 * Orden de venta generada al iniciar el pago (HU-013).
 *
 * Congela totales e ítems del carrito. El pago (`Payment`) confirma o
 * rechaza; tickets/factura digitales = HU-014.
 *
 * @remarks
 * **Patrón:** Aggregate Root (order + line items).
 * Problema que resuelve: inmutabilizar el snapshot comercial aunque el
 * carrito cambie o expire después del checkout.
 */
@Entity('orders')
@Index(['userId', 'status'])
@Index(['cartId'])
@Index(['reservationId'])
export class Order {
  /** UUID de la orden. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Comprador (JWT). */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Carrito origen (pasa a CHECKOUT / COMPLETED). */
  @Column({ type: 'uuid' })
  cartId!: string;

  /** Reserva de sillas asociada (RN-056 anti duplicado). */
  @Column({ type: 'uuid' })
  reservationId!: string;

  /** Función de las entradas. */
  @Column({ type: 'uuid' })
  showtimeId!: string;

  /** PENDING → PAID | FAILED | CANCELLED. */
  @Column({ type: 'varchar', length: 20 })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 8, default: 'COP' })
  currency!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  ticketsSubtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  snacksSubtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  membershipDiscount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  promoDiscount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  giftcardAmount!: number;

  /** Código de bono aplicado (HU-018); se debita al PAID. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  giftcardCode!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  promoCode!: string | null;

  @Column({ type: 'uuid', nullable: true })
  cinemaId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cinemaName!: string | null;

  /**
   * Flags de documentos digitales (HU-014).
   * Pasan a `true` tras `TicketsService.fulfillPaidOrder`.
   */
  @Column({ type: 'boolean', default: false })
  ticketsGenerated!: boolean;

  /** Factura/comprobante emitido (HU-014). */
  @Column({ type: 'boolean', default: false })
  invoiceGenerated!: boolean;

  @OneToMany(() => OrderTicketItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  tickets!: OrderTicketItem[];

  @OneToMany(() => OrderSnackItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  snacks!: OrderSnackItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
