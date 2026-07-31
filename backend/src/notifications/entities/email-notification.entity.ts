import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  EmailCategory,
  EmailNotificationStatus,
  EmailTemplate,
} from '../enums/email-notification.enums';

/**
 * Historial / outbox de correos transaccionales (HU-015 / RN-061).
 *
 * Cada intento de envío queda auditado: plantilla, destinatario, estado,
 * reintentos (RN-063) y error último si aplica.
 */
@Entity('email_notifications')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['template', 'relatedEntityId'], { unique: false })
export class EmailNotification {
  /** UUID del registro de notificación. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Usuario destinatario (puede ser null si solo conocemos el email,
   * p.ej. aviso de estreno provisional HU-005).
   */
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  /** Correo destino normalizado en minúsculas. */
  @Column({ type: 'varchar', length: 255 })
  toEmail!: string;

  /** Plantilla usada para el cuerpo HTML. */
  @Column({ type: 'varchar', length: 64 })
  template!: EmailTemplate;

  /** Categoría para aplicar preferencias (RN-062). */
  @Column({ type: 'varchar', length: 32 })
  category!: EmailCategory;

  /** Asunto del mensaje. */
  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  /** Estado actual del envío. */
  @Column({
    type: 'varchar',
    length: 32,
    default: EmailNotificationStatus.PENDING,
  })
  status!: EmailNotificationStatus;

  /**
   * Intentos realizados (máx. 3 según RN-063).
   * Empieza en 0; cada llamada al gateway incrementa.
   */
  @Column({ type: 'int', default: 0 })
  attemptCount!: number;

  /** Tope de reintentos (RN-063). */
  @Column({ type: 'int', default: 3 })
  maxAttempts!: number;

  /** Último mensaje de error del adaptador (si falló). */
  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  /**
   * Variables de plantilla / metadatos (JSON).
   * No guardar secretos (tokens sí, con cuidado; en prod rotar TTL corto).
   */
  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  /**
   * Tipo de entidad relacionada (`ORDER`, `MOVIE`, `TICKET`, …)
   * para idempotencia de recordatorios y auditoría.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  relatedEntityType!: string | null;

  /** UUID de la entidad relacionada. */
  @Column({ type: 'uuid', nullable: true })
  relatedEntityId!: string | null;

  /** Momento en que el adaptador confirmó el envío. */
  @Column({ type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
