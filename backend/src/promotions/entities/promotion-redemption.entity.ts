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
import { Promotion } from './promotion.entity';

/**
 * Redención de una promoción por un usuario (HU-026 / RN-107).
 *
 * Se registra al confirmar el pago (orden PAID), no al aplicar el cupón
 * en el carrito (así un carrito abandonado no consume el cupo).
 */
@Entity('promotion_redemptions')
@Index(['promotionId', 'userId'])
export class PromotionRedemption {
  /** UUID de la redención. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Promoción usada. */
  @Column({ type: 'uuid' })
  promotionId!: string;

  @ManyToOne(() => Promotion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotionId' })
  promotion!: Promotion;

  /** Usuario que la redimió. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Orden pagada asociada (si aplica). */
  @Column({ type: 'uuid', nullable: true })
  orderId!: string | null;

  /** Código aplicado (por si la promo no tenía code fijo). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  codeApplied!: string | null;

  /** Monto descontado en esa compra. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  redeemedAt!: Date;
}
