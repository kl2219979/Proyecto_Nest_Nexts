import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Order } from '../../payments/entities/order.entity';

/**
 * Factura / comprobante electrónico asociado a una orden pagada (HU-014).
 *
 * Contiene el resumen de entradas + confitería, totales y condiciones.
 * El PDF se regenera bajo demanda (RN-059, “Mis compras”).
 *
 * @remarks
 * **Patrón:** Document Object ligado 1:1 a Order.
 * Problema que resuelve: conservar un comprobante fiscal/comercial
 * inmutable aunque el carrito ya no exista.
 */
@Entity('invoices')
@Index(['userId', 'issuedAt'])
export class Invoice {
  /** UUID de la factura. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Orden pagada (única factura por orden). */
  @Column({ type: 'uuid', unique: true })
  orderId!: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  /** Comprador. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /**
   * Número legible único (ej. `FE-20260730-A1B2C3`).
   * Identifica el comprobante ante el usuario.
   */
  @Column({ type: 'varchar', length: 40, unique: true })
  number!: string;

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

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  promoCode!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cinemaName!: string | null;

  /** Nombre del comprador al emitir. */
  @Column({ type: 'varchar', length: 220 })
  buyerName!: string;

  /** Email del comprador (soporte del comprobante). */
  @Column({ type: 'varchar', length: 255 })
  buyerEmail!: string;

  /**
   * Snapshot JSON de líneas (entradas + snacks) para el PDF.
   * Evita joins frágiles si las líneas de orden cambian de forma.
   */
  @Column({ type: 'text' })
  linesJson!: string;

  /** Condiciones de uso embebidas en el comprobante. */
  @Column({ type: 'text' })
  termsText!: string;

  @Column({ type: 'timestamptz' })
  issuedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
