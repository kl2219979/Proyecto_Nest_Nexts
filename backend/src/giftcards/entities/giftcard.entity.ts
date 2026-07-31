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
import { PaymentMethod } from '../../payments/enums/payment.enums';
import { GiftcardStatus, GiftcardTheme } from '../enums/giftcard.enums';

/**
 * Bono de regalo digital (HU-018).
 *
 * Flujo: compra + pago → código/QR únicos (RN-076) → correo inmediato
 * o programado → redención parcial o total (RN-077) hasta `expiresAt`
 * (RN-078). Aplicable a entradas y confitería vía carrito (RN-079).
 *
 * @remarks
 * **Patrón:** Entity (Aggregate de bono + saldo).
 * Problema que resuelve: modelar venta, entrega y consumo de saldo
 * sin mezclarlo con órdenes de sillas (HU-013).
 */
@Entity('giftcards')
@Unique(['code'])
@Unique(['qrPayload'])
@Unique(['idempotencyKey'])
@Index(['purchaserUserId', 'status'])
@Index(['recipientEmail', 'status'])
@Index(['gatewayReference'])
@Index(['scheduledSendAt', 'sentAt'])
export class Giftcard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Código alfanumérico único (RN-076), p. ej. `MCGC-A1B2C3D4`. */
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  /** Payload del QR (mismo valor legible por escáner / app). */
  @Column({ type: 'varchar', length: 80 })
  qrPayload!: string;

  /** Comprador (JWT que inició `POST /giftcards`). */
  @Column({ type: 'uuid' })
  purchaserUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaserUserId' })
  purchaser!: User;

  /** Destinatario del regalo. */
  @Column({ type: 'varchar', length: 220 })
  recipientName!: string;

  @Column({ type: 'varchar', length: 255 })
  recipientEmail!: string;

  /** Mensaje personalizado opcional. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  message!: string | null;

  @Column({ type: 'varchar', length: 20 })
  theme!: GiftcardTheme;

  /** Valor facial original (COP). */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  faceValue!: number;

  /** Saldo restante (RN-077). */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  remainingBalance!: number;

  /**
   * Si `true`, se puede gastar por partes (RN-077).
   * Configurable al comprar; default del sistema.
   */
  @Column({ type: 'boolean', default: true })
  allowPartialUse!: boolean;

  @Column({ type: 'varchar', length: 20 })
  status!: GiftcardStatus;

  /** Caducidad del bono (RN-078). */
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /**
   * Momento programado de envío del correo.
   * `null` = envío inmediato tras pago APPROVED.
   */
  @Column({ type: 'timestamptz', nullable: true })
  scheduledSendAt!: Date | null;

  /** Cuándo se envió realmente el correo (null = pendiente). */
  @Column({ type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  /** Medio de pago usado en la compra. */
  @Column({ type: 'varchar', length: 20 })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'varchar', length: 80 })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 80 })
  gatewayReference!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  paymentMethodToken!: string | null;

  @Column({ type: 'text' })
  encryptedPayload!: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
