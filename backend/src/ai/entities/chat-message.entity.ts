import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatMessageRole } from '../enums/ai.enums';
import { ChatSession } from './chat-session.entity';

/**
 * Mensaje individual de una sesión del chatbot (HU-021).
 *
 * Los turnos ASSISTANT pueden guardar el snapshot de recomendaciones
 * mostradas (para historial y auditoría educativa).
 */
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => ChatSession, (s) => s.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session?: ChatSession;

  @Column({ type: 'varchar', length: 20 })
  role!: ChatMessageRole;

  @Column({ type: 'text' })
  content!: string;

  /**
   * Snapshot opcional de tarjetas recomendadas (solo ASSISTANT).
   */
  @Column({ type: 'jsonb', nullable: true })
  recommendations!: unknown[] | null;

  /** Intención detectada en este turno (si aplica). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  intent!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
