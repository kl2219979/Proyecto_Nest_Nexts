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
 * Comentario en un caso PQRS (cliente o staff) — HU-028.
 *
 * `isInternal = true` → solo visible para STAFF+ (notas internas).
 */
@Entity('pqrs_comments')
@Index(['pqrsId', 'createdAt'])
export class PqrsComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pqrsId!: string;

  @ManyToOne(() => PqrsCase, (c) => c.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pqrsId' })
  pqrsCase!: PqrsCase;

  @Column({ type: 'uuid' })
  authorUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorUserId' })
  author!: User;

  @Column({ type: 'varchar', length: 2000 })
  body!: string;

  /**
   * Si true, el cliente no ve el comentario (solo staff).
   * El cliente nunca puede crear internos.
   */
  @Column({ type: 'boolean', default: false })
  isInternal!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
