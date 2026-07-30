import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';

/**
 * Línea de confitería en el carrito (HU-011 estructura / HU-012 catálogo).
 *
 * En esta HU el carrito puede guardar snacks provisionales vía PUT;
 * validación de stock y catálogo real llegan en HU-012.
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
   * Id de producto de confitería.
   * Hasta HU-012 puede ser un UUID inventado por el cliente de prueba.
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
