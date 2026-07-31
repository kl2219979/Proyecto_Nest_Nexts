import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Auditoría de solicitudes a la API pública (HU-029 / RN-117).
 *
 * Registra cliente externo, ruta, status y resumen de payload
 * para trazabilidad y monitoreo.
 */
@Entity('public_api_audit_logs')
@Index(['apiClientId', 'createdAt'])
@Index(['path', 'createdAt'])
export class PublicApiAuditLog {
  /** UUID del evento. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Cliente externo autenticado. */
  @Column({ type: 'uuid', nullable: true })
  apiClientId!: string | null;

  /** `clientId` público (denormalizado). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  apiClientPublicId!: string | null;

  /** Nombre del cliente (denormalizado). */
  @Column({ type: 'varchar', length: 160, nullable: true })
  apiClientName!: string | null;

  /** Usuario final del JWT, si la ruta lo exige. */
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  /** Método HTTP. */
  @Column({ type: 'varchar', length: 10 })
  method!: string;

  /** Ruta relativa. */
  @Column({ type: 'varchar', length: 255 })
  path!: string;

  /** Recurso lógico (movies, auth, orders…). */
  @Column({ type: 'varchar', length: 80 })
  resource!: string;

  /** Acción (READ, CREATE, TOKEN…). */
  @Column({ type: 'varchar', length: 80 })
  action!: string;

  /** ID de recurso en path, si aplica. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  resourceId!: string | null;

  /** Mecanismo usado: `api_key` | `oauth_client`. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  authMethod!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'int', nullable: true })
  statusCode!: number | null;

  /** Resumen JSON sin secretos (truncado). */
  @Column({ type: 'text', nullable: true })
  payloadSummary!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
