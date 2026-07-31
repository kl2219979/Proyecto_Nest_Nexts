import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Snapshot diario del feed personalizado (HU-022 / RN-096).
 *
 * Se regenera en `GET /recommendations` si está caducado, o por el cron
 * nocturno. Guarda el ranking ya calculado para no re-analizar historial
 * en cada request del mismo día.
 *
 * @remarks
 * **Patrón:** Cache-Aside (snapshot por usuario + ciudad).
 * Problema que resuelve: actualizar recomendaciones diariamente sin
 * recalcular en caliente en cada hit.
 */
@Entity('recommendation_feeds')
@Index(['userId', 'cityId'], { unique: true })
export class RecommendationFeed {
  /** UUID del snapshot. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Dueño del feed. */
  @Column({ type: 'uuid' })
  userId!: string;

  /** Ciudad de contexto de cartelera. */
  @Column({ type: 'uuid' })
  cityId!: string;

  /**
   * Ítems rankeados (mismo shape que la respuesta HTTP).
   * Tipado laxo en DB; el servicio valida al devolver.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  items!: unknown[];

  /** Resumen de señales usadas (géneros, formatos, …). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  signals!: Record<string, unknown>;

  /** Momento del último cálculo (RN-096: válido el mismo día UTC). */
  @Column({ type: 'timestamptz' })
  computedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
