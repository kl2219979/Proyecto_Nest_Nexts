import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { CartStatus } from '../enums/cart.enums';
import { CartSnackItem } from './cart-snack-item.entity';
import { CartTicketItem } from './cart-ticket-item.entity';

/**
 * Carrito temporal de compra (HU-011).
 *
 * Unifica entradas (desde locks HU-010) y confitería (estructura;
 * catálogo/stock = HU-012) antes del pago (HU-013).
 *
 * RN-044 un carrito ACTIVE por usuario · RN-045 sillas bloqueadas
 * mientras esté activo · RN-046 expira ~10 min sin actividad.
 *
 * @remarks
 * **Patrón:** Aggregate Root (cart + items).
 * Problema que resuelve: totalizar entradas/snacks/descuentos en una
 * sola unidad de trabajo con ciclo de vida y expiración propios.
 */
@Entity('carts')
@Index(['userId', 'status'])
export class Cart {
  /** UUID del carrito. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Titular (JWT). */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** ACTIVE | CHECKOUT | COMPLETED | EXPIRED | CANCELLED. */
  @Column({ type: 'varchar', length: 20 })
  status!: CartStatus;

  /**
   * Grupo de locks de sillas (HU-010) asociado a las entradas.
   * Mantiene la reserva temporal alineada al carrito (RN-045).
   */
  @Column({ type: 'uuid' })
  reservationId!: string;

  /** Función de las entradas (todas del mismo showtime en esta HU). */
  @Column({ type: 'uuid' })
  showtimeId!: string;

  /**
   * Caducidad del carrito (RN-046).
   * Se renueva en cada mutación / consulta activa.
   */
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /** Última actividad (creación, GET, PUT, apply-*). */
  @Column({ type: 'timestamptz' })
  lastActivityAt!: Date;

  /**
   * Si `true`, se aplica el % de membresía sobre entradas/snacks (RN-047).
   * Por defecto activo al crear; `POST /cart/apply-membership` lo fuerza.
   */
  @Column({ type: 'boolean', default: true })
  membershipDiscountApplied!: boolean;

  /**
   * Cupón aplicado desde el catálogo (HU-026).
   * RN-048 / RN-105: no combinar si `promoStackable = false`.
   */
  @Column({ type: 'varchar', length: 40, nullable: true })
  promoCode!: string | null;

  /** Monto fijo descontado por la promoción vigente. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  promoDiscountAmount!: number;

  /**
   * Si la promo actual admite otra en el futuro (RN-048).
   * `null` = sin promo.
   */
  @Column({ type: 'boolean', nullable: true })
  promoStackable!: boolean | null;

  /** Código de giftcard (redención real = HU-018). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  giftcardCode!: string | null;

  /** Monto de bono aplicado al total. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  giftcardAmount!: number;

  @OneToMany(() => CartTicketItem, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  tickets!: CartTicketItem[];

  /**
   * Líneas de confitería (vacías hasta HU-012).
   * La entidad existe para el resumen del carrito.
   */
  @OneToMany(() => CartSnackItem, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  snacks!: CartSnackItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
