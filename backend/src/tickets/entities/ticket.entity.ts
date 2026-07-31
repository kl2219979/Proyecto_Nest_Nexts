import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Order } from '../../payments/entities/order.entity';
import { OrderTicketItem } from '../../payments/entities/order-ticket-item.entity';
import { TicketStatus, TicketType } from '../enums/ticket.enums';

/**
 * Entrada digital con QR único (HU-014).
 *
 * Se genera al aprobar el pago (webhook APPROVED). El PDF se arma
 * bajo demanda (RN-059); el escaneo de puerta es HU-024.
 *
 * RN-057: `qrPayload` único · RN-058/060: un solo uso vía `status=USED`.
 *
 * @remarks
 * **Patrón:** Aggregate hijo de Order (no Aggregate Root propio).
 * Problema que resuelve: desacoplar el documento de ingreso del snapshot
 * comercial (`OrderTicketItem`) sin duplicar la lógica de venta.
 */
@Entity('tickets')
@Index(['userId', 'createdAt'])
@Index(['orderId'])
export class Ticket {
  /** UUID de la entrada. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Orden de venta origen. */
  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  /** Línea de orden que originó esta entrada (1:1). */
  @Column({ type: 'uuid', unique: true })
  orderTicketItemId!: string;

  @ManyToOne(() => OrderTicketItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderTicketItemId' })
  orderTicketItem!: OrderTicketItem;

  /** Titular comprador. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /**
   * Código legible único (ej. `TKT-A1B2C3D4`).
   * Aparece en el PDF y en “Mis compras”.
   */
  @Column({ type: 'varchar', length: 32, unique: true })
  code!: string;

  /**
   * Payload opaco del QR (RN-057).
   * Único e intransferible; HU-024 lo validará en puerta.
   */
  @Column({ type: 'varchar', length: 64, unique: true })
  qrPayload!: string;

  /** VALID → USED (puerta) | CANCELLED. */
  @Column({ type: 'varchar', length: 20, default: TicketStatus.VALID })
  status!: TicketStatus;

  /** STANDARD u otra variante. */
  @Column({ type: 'varchar', length: 20, default: TicketType.STANDARD })
  ticketType!: TicketType;

  /** Snapshot denormalizado para el PDF (inmutable tras la compra). */
  @Column({ type: 'varchar', length: 200 })
  movieTitle!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'varchar', length: 120 })
  cinemaName!: string;

  @Column({ type: 'varchar', length: 80 })
  roomName!: string;

  @Column({ type: 'varchar', length: 16 })
  seatLabel!: string;

  @Column({ type: 'varchar', length: 20 })
  format!: string;

  @Column({ type: 'varchar', length: 40 })
  language!: string;

  /** Nombre completo del comprador al momento de emitir. */
  @Column({ type: 'varchar', length: 220 })
  buyerName!: string;

  /** Momento en que se invalidó por ingreso (HU-024). */
  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
