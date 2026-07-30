import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';

/**
 * Línea de confitería en el carrito (HU-011 / HU-012).
 *
 * Snapshot de nombre/precio al agregar desde el catálogo (`SnacksService`).
 * El stock del catálogo no se descuenta aquí (RN-052 → pago HU-013).
 */
@Entity('cart_snack_items')
export class CartSnackItem {
  /** UUID de la línea. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  cartId!: string;

  @ManyToOne(() => Cart, (cart) => cart.snacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart!: Cart;

  /**
   * Id del producto en `snacks` (catálogo HU-012).
   */
  @Column({ type: 'uuid' })
  snackId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;
}
