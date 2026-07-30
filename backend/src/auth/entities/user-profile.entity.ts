import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { City } from '../../locations/entities/city.entity';
import { Cinema } from '../../locations/entities/cinema.entity';
import { Gender } from '../enums/user.enums';
import { User } from './user.entity';

/**
 * Perfil personal del usuario (HU-006).
 *
 * Se crea en el mismo flujo que la cuenta: nombre, documento ya está
 * en `User`; aquí van datos demográficos y preferencia de ciudad/cine.
 */
@Entity('user_profiles')
export class UserProfile {
  /** UUID del perfil. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FK 1:1 al usuario. */
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Nombre. */
  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  /** Apellidos. */
  @Column({ type: 'varchar', length: 120 })
  lastName!: string;

  /** Fecha de nacimiento (solo fecha, sin hora). */
  @Column({ type: 'date' })
  birthDate!: string;

  /** Género opcional. */
  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender | null;

  /** Ciudad principal (contexto de cartelera). */
  @Column({ type: 'uuid' })
  cityId!: string;

  @ManyToOne(() => City, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cityId' })
  city!: City;

  /** Complejo favorito (opcional). */
  @Column({ type: 'uuid', nullable: true })
  favoriteCinemaId!: string | null;

  @ManyToOne(() => Cinema, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'favoriteCinemaId' })
  favoriteCinema!: Cinema | null;
}
