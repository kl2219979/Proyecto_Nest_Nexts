import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Auditoría de intentos de acceso (HU-007).
 *
 * Registra IP y dispositivo (User-Agent) en cada login exitoso o fallido.
 */
@Entity('login_audits')
export class LoginAudit {
  /** UUID del evento. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Usuario involucrado (nullable si el email no existe:
   * aún así auditamos el intento con el email intentado).
   */
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  /** Email usado en el intento (siempre, para trazabilidad). */
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /** `true` = credenciales OK y sesión emitida. */
  @Column({ type: 'boolean' })
  success!: boolean;

  /** Motivo breve si falló (password, locked, unverified, …). */
  @Column({ type: 'varchar', length: 120, nullable: true })
  failureReason!: string | null;

  /** IP del cliente. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  /** User-Agent / dispositivo. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
