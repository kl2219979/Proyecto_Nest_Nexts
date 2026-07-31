import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MembershipLevel } from '../../membership/enums/membership.enums';
import { MovieFormat } from '../../movies/enums/movie.enums';
import { DiscountKind, PromotionType } from '../enums/promotion.enums';

/**
 * Promoción o cupón administrable (HU-026).
 *
 * Configura vigencia (RN-106), apilabilidad (RN-105 / RN-048),
 * tope por usuario (RN-107) y scopes opcionales (ciudad, cine, sala,
 * película, género, formato).
 *
 * @remarks
 * **Patrón:** Entity (TypeORM) + Aggregate Root del dominio promociones.
 * Problema que resuelve: persistir reglas de marketing sin hardcodear
 * cupones demo en el carrito.
 */
@Entity('promotions')
@Index(['isActive', 'startsAt', 'endsAt'])
export class Promotion {
  /** UUID de la promoción. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Código de cupón (uppercase). `null` = promo automática (sin código).
   * Único cuando no es null (PostgreSQL permite varios NULL).
   * Ej. `MULTICINE10`, `BDAY20`.
   */
  @Column({ type: 'varchar', length: 40, nullable: true, unique: true })
  code!: string | null;

  /** Nombre visible en admin / UI. */
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** Descripción comercial. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  /** Tipo de campaña del catálogo HU-026. */
  @Column({ type: 'varchar', length: 30 })
  type!: PromotionType;

  /** Mecánica de cálculo. */
  @Column({ type: 'varchar', length: 20 })
  discountKind!: DiscountKind;

  /**
   * Valor del descuento:
   * - PERCENT → 0–100
   * - FIXED → COP
   * - TWO_FOR_ONE → ignorado (0)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountValue!: number;

  /**
   * Si admite combinarse con otra promo (RN-105 / RN-048).
   * Si cualquiera de las dos es `false`, no se apilan.
   */
  @Column({ type: 'boolean', default: false })
  stackable!: boolean;

  /** Inicio de vigencia inclusive (RN-106). */
  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  /** Fin de vigencia inclusive (RN-106). */
  @Column({ type: 'timestamptz' })
  endsAt!: Date;

  /**
   * Máximo de redenciones por usuario (RN-107).
   * `null` = sin tope.
   */
  @Column({ type: 'int', nullable: true })
  maxUsesPerUser!: number | null;

  /**
   * Tope global de redenciones.
   * `null` = sin tope.
   */
  @Column({ type: 'int', nullable: true })
  maxTotalUses!: number | null;

  /** Soft-off administrativo. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Si `true`, solo aplica vía `POST /cart/apply-promo` con código.
   * Si `false`, puede listarse en precios de función (RN-038).
   */
  @Column({ type: 'boolean', default: true })
  requiresCode!: boolean;

  /** Scope opcional: ciudad. */
  @Column({ type: 'uuid', nullable: true })
  cityId!: string | null;

  /** Scope opcional: complejo. */
  @Column({ type: 'uuid', nullable: true })
  cinemaId!: string | null;

  /** Scope opcional: sala. */
  @Column({ type: 'uuid', nullable: true })
  roomId!: string | null;

  /** Scope opcional: película. */
  @Column({ type: 'uuid', nullable: true })
  movieId!: string | null;

  /** Scope opcional: género / categoría. */
  @Column({ type: 'uuid', nullable: true })
  genreId!: string | null;

  /** Scope opcional: formato de proyección. */
  @Column({ type: 'varchar', length: 10, nullable: true })
  format!: MovieFormat | null;

  /** Aplica sobre entradas. */
  @Column({ type: 'boolean', default: true })
  appliesToTickets!: boolean;

  /** Aplica sobre confitería. */
  @Column({ type: 'boolean', default: false })
  appliesToSnacks!: boolean;

  /**
   * Nivel mínimo de membresía (tipos MEMBERSHIP).
   * `null` = cualquier socio con membresía activa.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  minMembershipLevel!: MembershipLevel | null;

  /**
   * Ventana de cumpleaños en días (±).
   * `0` = solo el día exacto (mes/día).
   */
  @Column({ type: 'int', default: 0 })
  birthdayWindowDays!: number;

  /**
   * RN-100 (HU-023): si `true`, la compra con este cupón
   * no acumula puntos ni admite redención de puntos.
   */
  @Column({ type: 'boolean', default: false })
  incompatibleWithPoints!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
