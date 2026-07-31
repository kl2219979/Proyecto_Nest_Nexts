import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiClientScope } from '../enums/public-api.enums';

/**
 * Consumidor externo de la API pública (HU-029 / RN-114).
 *
 * Credenciales individuales: `clientId` + secreto (OAuth) y/o API Key.
 * Los secretos se almacenan hasheados (SHA-256); el valor en claro
 * solo se muestra una vez al crear/rotar.
 *
 * @remarks
 * **Patrón:** Entity (TypeORM).
 * Problema que resuelve: modelar apps móviles, kioscos y partners
 * con límites y scopes propios sin mezclarlos con usuarios finales.
 */
@Entity('api_clients')
@Index(['clientId'], { unique: true })
@Index(['apiKeyPrefix'])
export class ApiClient {
  /** UUID interno del cliente. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre legible (ej. "App iOS Multicine", "Kiosco Centro"). */
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  /** Descripción opcional del integrador. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  /**
   * Identificador público OAuth (`client_id`).
   * Formato sugerido: `mcc_…`.
   */
  @Column({ type: 'varchar', length: 64 })
  clientId!: string;

  /** Hash SHA-256 del `client_secret` (nunca en claro). */
  @Column({ type: 'varchar', length: 64 })
  clientSecretHash!: string;

  /**
   * Prefijo de la API Key (primeros caracteres) para búsqueda.
   * La key completa nunca se guarda.
   */
  @Column({ type: 'varchar', length: 16, nullable: true })
  apiKeyPrefix!: string | null;

  /** Hash SHA-256 de la API Key completa. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  apiKeyHash!: string | null;

  /**
   * Scopes autorizados (JSON array de `ApiClientScope`).
   * RN-115: escritura/lectura acotada por scope.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  scopes!: ApiClientScope[];

  /**
   * Tope de peticiones por minuto (RN-114 / RN-116).
   * Independiente del Throttler global.
   */
  @Column({ type: 'int', default: 60 })
  rateLimitPerMinute!: number;

  /** Si false, cualquier credencial de este cliente falla. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Último uso exitoso de credenciales (monitoreo). */
  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
