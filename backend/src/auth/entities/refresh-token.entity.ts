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
 * Refresh Token persistido (HU-007).
 *
 * RN-029: vigencia 7 días.
 * RN-030: un nuevo login invalida el refresh anterior (revoca filas activas).
 *
 * Se guarda el **hash** del token (igual que la contraseña): si filtran la BD
 * no pueden reutilizar el refresh en texto plano.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  /** UUID de la fila. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Usuario dueño del refresh. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Hash SHA-256 del refresh token opaco. */
  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash!: string;

  /** Caducidad absoluta (RN-029: +7 días desde emisión). */
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /** Momento de revocación (logout o nuevo login RN-030). */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  /** IP de emisión (auditoría). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  /** User-Agent / dispositivo de emisión. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
