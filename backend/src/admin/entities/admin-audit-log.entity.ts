import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Registro de auditoría del backoffice (HU-020 / RN-087 / RN-090).
 *
 * Cada mutación admin guarda: usuario, IP, acción, recurso y payload.
 */
@Entity('admin_audit_logs')
@Index(['userId', 'createdAt'])
@Index(['resource', 'createdAt'])
export class AdminAuditLog {
  /** UUID del evento. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Operador autenticado (JWT). Null solo si no hubo sesión. */
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  /** Email del operador (denormalizado para lectura rápida). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  userEmail!: string | null;

  /** Rol del operador al momento de la acción. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  userRole!: string | null;

  /** Método HTTP (POST, PUT, PATCH, DELETE, GET…). */
  @Column({ type: 'varchar', length: 10 })
  method!: string;

  /** Ruta relativa (ej. `/api/admin/movies`). */
  @Column({ type: 'varchar', length: 255 })
  path!: string;

  /** Recurso lógico (countries, movies, users…). */
  @Column({ type: 'varchar', length: 80 })
  resource!: string;

  /** Acción legible (CREATE, UPDATE, DELETE, LIST, REPORT…). */
  @Column({ type: 'varchar', length: 80 })
  action!: string;

  /** ID del recurso afectado, si aplica. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  resourceId!: string | null;

  /** Dirección IP del cliente (RN-090). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  /** User-Agent truncado. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  /** Código HTTP de la respuesta. */
  @Column({ type: 'int', nullable: true })
  statusCode!: number | null;

  /** Resumen JSON del body (sin secretos; truncado). */
  @Column({ type: 'text', nullable: true })
  payloadSummary!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
