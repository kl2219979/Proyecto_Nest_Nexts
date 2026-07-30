import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Preferencias de notificación del usuario (HU-006).
 *
 * Se crean vacías/con defaults al registrar.
 * El motor de correo real es HU-015; aquí solo persistimos la preferencia.
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
