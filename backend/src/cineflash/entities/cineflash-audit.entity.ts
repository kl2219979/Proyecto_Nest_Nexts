import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  CineFlashAuditAction,
  CineFlashAuditReason,
} from '../enums/cineflash.enums';

/**
 * Auditoría de activaciones / desactivaciones de Cine Flash (HU-019 / RN-085).
 *
 * @remarks
 * **Patrón:** Entity (TypeORM) de evento de dominio.
 * Problema que resuelve: dejar rastro auditable del job automático
 * sin depender del interceptor HTTP del panel admin.
 */
@Entity('cineflash_audits')
@Index(['showtimeId', 'createdAt'])
export class CineFlashAudit {
  /** UUID del evento. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Función evaluada. */
  @Column({ type: 'uuid' })
  showtimeId!: string;

  /** Promo CINE_FLASH creada o apagada (`null` si no hubo promo). */
  @Column({ type: 'uuid', nullable: true })
  promotionId!: string | null;

  /** ACTIVATED | DEACTIVATED. */
  @Column({ type: 'varchar', length: 20 })
  action!: CineFlashAuditAction;

  /** Motivo de negocio. */
  @Column({ type: 'varchar', length: 40 })
  reason!: CineFlashAuditReason;

  /** Ocupación en el momento (0–100). */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  occupancyPercent!: number;

  /** Sillas vendidas al evaluar. */
  @Column({ type: 'int' })
  soldSeats!: number;

  /** Capacidad de la sala. */
  @Column({ type: 'int' })
  capacity!: number;

  /**
   * `maxSeatsPerOrder` previo a forzar RN-081 (=3).
   * Solo en ACTIVATED; se restaura al desactivar.
   */
  @Column({ type: 'int', nullable: true })
  previousMaxSeatsPerOrder!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
