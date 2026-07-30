import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../enums/payment.enums';
import { Order } from './order.entity';

/**
 * Intento de cobro ligado a una orden (HU-013).
 *
 * Nunca guarda PAN/CVV: solo `paymentMethodToken` (tokenización).
 * El payload hacia la pasarela se cifra con AES-256-GCM.
 *
 * @remarks
 * **Patrón:** Entity + unique `idempotencyKey` (RN-056).
 * Problema que resuelve: reintentos del cliente no crean cobros duplicados.
 */
@Entity('payments')
@Unique(['idempotencyKey'])
@Index(['userId', 'status'])
@Index(['gatewayReference'])
@Index(['reservationId', 'status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  cartId!: string;

  /** Misma reserva del carrito (anti pago duplicado RN-056). */
  @Column({ type: 'uuid' })
  reservationId!: string;

  @Column({ type: 'varchar', length: 20 })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 20 })
  status!: PaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 8, default: 'COP' })
  currency!: string;

  /**
   * Clave de idempotencia del cliente (o generada por el servidor).
   * Unique a nivel DB.
   */
  @Column({ type: 'varchar', length: 80 })
  idempotencyKey!: string;

  /** Referencia que devuelve / espera la pasarela stub. */
  @Column({ type: 'varchar', length: 80 })
  gatewayReference!: string;

  /**
   * Token del medio (nunca el número de tarjeta).
   * Opcional en PSE/Nequi/Daviplata demo.
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  paymentMethodToken!: string | null;

  /**
   * Payload cifrado AES-256-GCM enviado a la pasarela (educativo).
   * No incluye datos de tarjeta en claro.
   */
  @Column({ type: 'text' })
  encryptedPayload!: string;

  /** Momento de confirmación APPROVED/REJECTED vía webhook. */
  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
