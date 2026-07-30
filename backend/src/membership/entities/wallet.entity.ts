import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/**
 * Billetera de bonos / giftcards del usuario (HU-006).
 *
 * Se crea vacía (`balance = 0`) al registrar.
 * Carga y redención real = HU-018.
 */
@Entity('wallets')
export class Wallet {
  /** UUID de la billetera. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Un usuario = una billetera. */
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Saldo en moneda local (COP). Vacío al crear = 0. */
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  balance!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
