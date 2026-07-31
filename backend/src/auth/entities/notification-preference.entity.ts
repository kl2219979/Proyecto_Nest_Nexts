import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Preferencias de notificación del usuario (HU-006 / HU-015).
 *
 * Se crean con defaults al registrar.
 * RN-062: marketing/upcoming son opt-out; los correos transaccionales
 * obligatorios (compra, activación, reset…) siempre se envían.
 */
@Entity('notification_preferences')
export class NotificationPreference {
  /** UUID de la fila de preferencias. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FK 1:1 al usuario. */
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.notificationPreferences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Correos transaccionales (compra, activación, etc.). */
  @Column({ type: 'boolean', default: true })
  emailTransactional!: boolean;

  /** Marketing / promociones (respeta `acceptMarketing` del registro). */
  @Column({ type: 'boolean', default: false })
  emailMarketing!: boolean;

  /** Avisos de próximos estrenos (HU-005). */
  @Column({ type: 'boolean', default: true })
  emailUpcoming!: boolean;
}
