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
import { MembershipLevel, MembershipStatus } from '../enums/membership.enums';

/**
 * Membresía digital del socio (HU-006).
 *
 * RN-025: todo usuario registrado tiene una.
 * RN-026: `code` único generado automáticamente (ej. `MC-A1B2C3D4`).
 *
 * La membresía nace `ACTIVE` aunque la cuenta aún no haya verificado email;
 * lo que bloquea compras es `User.isActive` / `isEmailVerified` (RN-024).
 */
@Entity('memberships')
export class Membership {
  /** UUID de la membresía. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Un usuario = una membresía. */
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /**
   * Código único legible / escaneable (QR en HU-008).
   * @example "MC-A1B2C3D4"
   */
  @Column({ type: 'varchar', length: 32, unique: true })
  code!: string;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  status!: MembershipStatus;

  @Column({
    type: 'enum',
    enum: MembershipLevel,
    default: MembershipLevel.BRONZE,
  })
  level!: MembershipLevel;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
