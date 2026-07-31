import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Order } from '../../payments/entities/order.entity';

/**
 * Encuesta de satisfacción post-visita (HU-027).
 *
 * Se asocia 1:1 a una compra (`orderId`, RN-109). Solo puede crearla un
 * usuario que haya ingresado a sala (ticket `USED`, RN-108).
 *
 * Calificaciones de aspectos: 1–5. Probabilidad de recomendar: 0–10 (NPS).
 *
 * @remarks
 * **Patrón:** Entity (Aggregate Root de respuesta de encuesta).
 * Problema que resuelve: persistir feedback post-visita ligado a la compra
 * sin mezclarlo con tickets ni PQRS (HU-028).
 */
@Entity('surveys')
@Unique(['orderId'])
@Index(['userId', 'createdAt'])
export class Survey {
  /** UUID de la encuesta. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Usuario que respondió (JWT; debe haber asistido — RN-108). */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /**
   * Compra asociada (RN-109: una encuesta por orden).
   * Unique en BD evita doble envío concurrente.
   */
  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  /** Calificación de la película (1–5). */
  @Column({ type: 'smallint' })
  movieRating!: number;

  /** Calificación de la sala (1–5). */
  @Column({ type: 'smallint' })
  roomRating!: number;

  /** Calidad de sonido (1–5). */
  @Column({ type: 'smallint' })
  soundRating!: number;

  /** Calidad de imagen (1–5). */
  @Column({ type: 'smallint' })
  imageRating!: number;

  /** Comodidad (1–5). */
  @Column({ type: 'smallint' })
  comfortRating!: number;

  /** Confitería (1–5). */
  @Column({ type: 'smallint' })
  snacksRating!: number;

  /** Limpieza (1–5). */
  @Column({ type: 'smallint' })
  cleanlinessRating!: number;

  /** Servicio al cliente (1–5). */
  @Column({ type: 'smallint' })
  serviceRating!: number;

  /**
   * Probabilidad de recomendar el Multicine (0–10).
   * Escala tipo NPS: 0 = nada probable, 10 = muy probable.
   */
  @Column({ type: 'smallint' })
  recommendScore!: number;

  /** Comentarios libres opcionales. */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  comments!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
