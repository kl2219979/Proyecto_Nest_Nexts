import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cinema } from '../../locations/entities/cinema.entity';
import { SnackCategory } from '../enums/snack.enums';

/**
 * Producto de confitería del catálogo digital (HU-012).
 *
 * - `stock`: unidades disponibles para venta; **no** se descuenta al
 *   agregar al carrito (RN-052 → descuento tras pago HU-013).
 * - `cinemaId` null = disponible en todos los complejos (pickup
 *   se resuelve con el cine de la función del carrito).
 * - Promo de producto (`promoLabel` / `promoPercent`) es stub hasta
 *   administración (RN-050 / HU-026 / HU-020).
 */
@Entity('snacks')
@Index(['category', 'isActive'])
@Index(['cinemaId', 'isActive'])
export class Snack {
  /** UUID del producto. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  /** URL de imagen (el frontend la renderiza). */
  @Column({ type: 'varchar', length: 500 })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 30 })
  category!: SnackCategory;

  /** Precio unitario en COP. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  /**
   * Unidades en inventario de venta.
   * RN-049: no vender si `stock < cantidad pedida`.
   * RN-052: solo baja tras pago exitoso.
   */
  @Column({ type: 'int', default: 0 })
  stock!: number;

  /** Soft-delete lógico / fuera de menú. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Complejo donde se ofrece (null = todos).
   * Pickup concreto = cine de la función del carrito.
   */
  @Column({ type: 'uuid', nullable: true })
  cinemaId!: string | null;

  @ManyToOne(() => Cinema, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cinemaId' })
  cinema!: Cinema | null;

  /** Texto de promo vigente (ej. "2x1 jueves"); null = sin promo. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  promoLabel!: string | null;

  /** % de descuento de producto (0–100); admin real = HU-026. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  promoPercent!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
