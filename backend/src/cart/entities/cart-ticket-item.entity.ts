import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';

/**
 * Línea de entrada en el carrito (HU-011).
 *
 * Snapshot denormalizado (película, sala, precio) para que el resumen
 * no dependa de joins pesados en cada GET y sobreviva a cambios menores
 * de catálogo durante los ~10 min de vida del carrito.
 */
@Entity('cart_ticket_items')
export class CartTicketItem {
  /** UUID de la línea. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  cartId!: string;

  @ManyToOne(() => Cart, (cart) => cart.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart!: Cart;

  /** Función (`showtimes.id`). */
  @Column({ type: 'uuid' })
  showtimeId!: string;

  /** Silla bloqueada. */
  @Column({ type: 'uuid' })
  seatId!: string;

  /** Etiqueta legible (ej. "B5"). */
  @Column({ type: 'varchar', length: 20 })
  seatLabel!: string;

  @Column({ type: 'uuid' })
  movieId!: string;

  @Column({ type: 'varchar', length: 200 })
  movieTitle!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'varchar', length: 100 })
  roomName!: string;

  @Column({ type: 'varchar', length: 150 })
  cinemaName!: string;

  /** Formato de proyección (2D/3D/…). */
  @Column({ type: 'varchar', length: 10 })
  format!: string;

  @Column({ type: 'varchar', length: 10 })
  language!: string;

  /** Precio unitario al momento de crear el carrito. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;
}
