import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Preferencias del feed personalizado (HU-022).
 *
 * 1:1 con el usuario. Controla qué señales puede usar el motor (RN-097)
 * y la ventana de exclusión de películas ya vistas (RN-098).
 *
 * @remarks
 * **Patrón:** Preferences Aggregate (flags + listas explícitas).
 * Problema que resuelve: separar consentimiento/configuración del
 * snapshot cacheado del feed diario.
 */
@Entity('recommendation_preferences')
@Index(['userId'], { unique: true })
export class RecommendationPreference {
  /** UUID de la fila. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Dueño (JWT). */
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  /**
   * RN-097: si `false`, el motor NO analiza historial de compras.
   * Sigue pudiendo usar preferencias explícitas y popularidad.
   */
  @Column({ type: 'boolean', default: true })
  allowPurchaseHistory!: boolean;

  /**
   * RN-097: si `false`, no usa `favoriteCinemaId` del perfil.
   * El `cityId` del query sigue siendo contexto de cartelera.
   */
  @Column({ type: 'boolean', default: true })
  allowProfileSignals!: boolean;

  /**
   * RN-098: días hacia atrás para excluir películas ya compradas.
   * Configurable por usuario; default 30.
   */
  @Column({ type: 'int', default: 30 })
  recentlyViewedDays!: number;

  /** Géneros favoritos declarados (nombres, ej. "Acción"). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  favoriteGenres!: string[];

  /** Formatos preferidos (`2D`, `3D`, `IMAX`, `VIP`). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  preferredFormats!: string[];

  /** Idiomas preferidos (`ES`, `EN`, …). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  preferredLanguages!: string[];

  /** Complejos preferidos (UUIDs de cine). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  preferredCinemaIds!: string[];

  /**
   * Días de la semana habituales (0=domingo … 6=sábado, `Date.getDay()`).
   * Vacío = sin sesgo de día.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  preferredWeekdays!: number[];

  /** Hora local preferida desde (0–23); null = sin franja. */
  @Column({ type: 'int', nullable: true })
  preferredHourFrom!: number | null;

  /** Hora local preferida hasta (0–23); null = sin franja. */
  @Column({ type: 'int', nullable: true })
  preferredHourTo!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
