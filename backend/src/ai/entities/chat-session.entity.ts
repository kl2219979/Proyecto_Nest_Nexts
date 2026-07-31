import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

/**
 * Sesión de conversación del chatbot (HU-021).
 *
 * Una sesión agrupa mensajes de un visitante o usuario autenticado
 * en un contexto de ciudad (RN-091).
 */
@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Titular autenticado (JWT). Null = visitante anónimo.
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  /**
   * Ciudad de contexto para cartelera (RN-091).
   * Se actualiza si el cliente envía otro `cityId` en un turno.
   */
  @Column({ type: 'uuid' })
  cityId!: string;

  /**
   * Edad declarada por el usuario (RN-093). Null si aún no la indicó.
   */
  @Column({ type: 'int', nullable: true })
  age!: number | null;

  /**
   * Preferencias acumuladas (género, acompañantes, audio, etc.) en JSON.
   */
  @Column({ type: 'jsonb', nullable: true })
  preferences!: Record<string, unknown> | null;

  /** RN-095: la sesión se marcó para soporte humano. */
  @Column({ type: 'boolean', default: false })
  escalated!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ChatMessage, (m) => m.session)
  messages?: ChatMessage[];
}
