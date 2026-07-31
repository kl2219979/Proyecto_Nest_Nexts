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
import { DocumentType } from '../../auth/enums/user.enums';
import { TicketTransferStatus } from '../enums/transfer.enums';

/**
 * Cesión digital de una o varias entradas (HU-017 / RN-071…075).
 *
 * Registra la solicitud, el destinatario y el resultado. Tras `ACCEPTED`
 * guarda IDs de QR anulados y nuevos para auditoría (RN-075).
 *
 * @remarks
 * **Patrón:** Audit Log + State (PENDING → ACCEPTED|CANCELLED|EXPIRED).
 * Problema que resuelve: trazabilidad de titularidad sin reescribir la
 * orden/factura del comprador original.
 */
@Entity('ticket_transfers')
@Index(['fromUserId', 'createdAt'])
@Index(['toEmail', 'status'])
@Index(['acceptToken'], { unique: true })
export class TicketTransfer {
  /** UUID de la transferencia. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Usuario que cede las entradas. */
  @Column({ type: 'uuid' })
  fromUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromUserId' })
  fromUser!: User;

  /**
   * Destinatario registrado (si ya tenía cuenta al solicitar o al aceptar).
   * Queda `null` mientras solo exista invitación por correo.
   */
  @Column({ type: 'uuid', nullable: true })
  toUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'toUserId' })
  toUser!: User | null;

  /** Correo normalizado del nuevo asistente. */
  @Column({ type: 'varchar', length: 255 })
  toEmail!: string;

  /** Nombre del nuevo asistente (dato solicitado en el flujo). */
  @Column({ type: 'varchar', length: 220 })
  toName!: string;

  /** Tipo de documento del destinatario. */
  @Column({ type: 'varchar', length: 20 })
  toDocumentType!: DocumentType;

  /** Número de documento del destinatario. */
  @Column({ type: 'varchar', length: 40 })
  toDocumentNumber!: string;

  /** `true` si al solicitar no existía cuenta (se envió invitación). */
  @Column({ type: 'boolean', default: false })
  recipientInvited!: boolean;

  /** PENDING | ACCEPTED | CANCELLED | EXPIRED. */
  @Column({ type: 'varchar', length: 20, default: TicketTransferStatus.PENDING })
  status!: TicketTransferStatus;

  /**
   * Token opaco del enlace de aceptación (correo).
   * Único; se limpia al cerrar la transferencia.
   */
  @Column({ type: 'varchar', length: 64 })
  acceptToken!: string;

  /** JSON array de UUIDs de entradas origen. */
  @Column({ type: 'text' })
  sourceTicketIdsJson!: string;

  /** Orden comercial de las entradas (no cambia el comprador). */
  @Column({ type: 'uuid' })
  orderId!: string;

  /** Snapshot película/hora para correos y listados. */
  @Column({ type: 'varchar', length: 200 })
  movieTitle!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  /** IDs anulados tras aceptar (RN-074); vacío mientras PENDING. */
  @Column({ type: 'text', default: '[]' })
  cancelledTicketIdsJson!: string;

  /** IDs nuevos emitidos al destinatario; vacío mientras PENDING. */
  @Column({ type: 'text', default: '[]' })
  newTicketIdsJson!: string;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
