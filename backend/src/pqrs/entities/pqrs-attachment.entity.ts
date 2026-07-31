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
import { PqrsCase } from './pqrs-case.entity';

/**
 * Adjunto de un caso PQRS (HU-028).
 *
 * El backend solo guarda la URL (mismo criterio que `photoUrl` del perfil):
 * el upload binario queda en frontend/CDN.
 */
@Entity('pqrs_attachments')
@Index(['pqrsId', 'createdAt'])
export class PqrsAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pqrsId!: string;

  @ManyToOne(() => PqrsCase, (c) => c.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pqrsId' })
  pqrsCase!: PqrsCase;

  @Column({ type: 'uuid' })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedBy!: User;

  /** Nombre original del archivo. */
  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  /** MIME type declarado por el cliente (ej. `image/jpeg`). */
  @Column({ type: 'varchar', length: 100 })
  mimeType!: string;

  /** URL pública o firmada del archivo (CDN / storage). */
  @Column({ type: 'varchar', length: 1000 })
  url!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
