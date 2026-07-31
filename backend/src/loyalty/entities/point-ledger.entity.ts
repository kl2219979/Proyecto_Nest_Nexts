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
import { PointLedgerType } from '../enums/loyalty.enums';

/**
 * Movimiento de puntos de fidelización (HU-023).
 *
 * Los lotes `EARN` guardan `remaining` y `expiresAt` para FIFO
 * (redención y vencimiento RN-099). Los débitos (`REDEEM_*` / `EXPIRE`)
 * dejan `remaining = 0`.
 *
 * @remarks
 * **Patrón:** Ledger / Event Sourcing ligero.
 * Problema que resuelve: auditar saldo y vencimientos sin un único
 * contador opaco que pierda historial.
 */
@Entity('point_ledger')
@Index(['userId', 'createdAt'])
@Index(['userId', 'type'])
@Index(['orderId'])
export class PointLedgerEntry {
  /** UUID del movimiento. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Titular de la membresía / puntos. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** EARN | REDEEM_CART | REDEEM_WALLET | EXPIRE. */
  @Column({ type: 'varchar', length: 20 })
  type!: PointLedgerType;

  /**
   * Cantidad absoluta del movimiento (siempre ≥ 0).
   * El signo lo determina `type` (crédito vs débito).
   */
  @Column({ type: 'int' })
  points!: number;

  /**
   * Saldo restante del lote (solo útil en EARN).
   * Baja con redenciones FIFO y con EXPIRE.
   */
  @Column({ type: 'int', default: 0 })
  remaining!: number;

  /**
   * Vencimiento del lote EARN (createdAt + 12 meses, RN-099).
   * `null` en débitos.
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  /** Orden que originó el EARN o el REDEEM_CART. */
  @Column({ type: 'uuid', nullable: true })
  orderId!: string | null;

  /** Monto COP asociado (descuento o crédito a billetera). */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amountCop!: number | null;

  /** Texto legible para historial. */
  @Column({ type: 'varchar', length: 255 })
  description!: string;

  /** Saldo disponible del usuario justo después de este movimiento. */
  @Column({ type: 'int' })
  balanceAfter!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
