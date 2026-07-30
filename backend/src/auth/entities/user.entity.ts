import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentType } from '../enums/user.enums';
import { UserProfile } from './user-profile.entity';
import { NotificationPreference } from './notification-preference.entity';

/**
 * Cuenta de usuario del portal (HU-006).
 *
 * RN-021: `email` único.
 * RN-024: `isEmailVerified = false` hasta confirmar el enlace de activación;
 * mientras tanto la cuenta no puede comprar (compras = HUs posteriores).
 *
 * La contraseña se guarda solo como hash BCrypt (`passwordHash`).
 */
@Entity('users')
export class User {
  /** UUID del usuario. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Correo único (normalizado a minúsculas al registrar). */
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  /** Hash BCrypt de la contraseña (nunca texto plano). */
  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  /** Celular de contacto. */
  @Column({ type: 'varchar', length: 30 })
  phone!: string;

  /** Tipo de documento (CC, CE, …). */
  @Column({ type: 'enum', enum: DocumentType })
  documentType!: DocumentType;

  /** Número de documento. */
  @Column({ type: 'varchar', length: 40 })
  documentNumber!: string;

  /**
   * `false` hasta que el usuario confirme el correo (RN-024).
   * Bloquea compras / login completo (login = HU-007).
   */
  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  /**
   * Cuenta habilitada para operar. Se pone `true` al activar el email.
   */
  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

  /** Token opaco de activación (24 h). Se limpia al verificar. */
  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  activationToken!: string | null;

  /** Caducidad del token de activación. */
  @Column({ type: 'timestamptz', nullable: true })
  activationTokenExpiresAt!: Date | null;

  /** Consentimiento obligatorio: tratamiento de datos. */
  @Column({ type: 'boolean', default: false })
  acceptPrivacy!: boolean;

  /** Consentimiento obligatorio: términos y condiciones. */
  @Column({ type: 'boolean', default: false })
  acceptTerms!: boolean;

  /** Opcional: comunicaciones comerciales. */
  @Column({ type: 'boolean', default: false })
  acceptMarketing!: boolean;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile!: UserProfile;

  @OneToOne(() => NotificationPreference, (prefs) => prefs.user)
  notificationPreferences!: NotificationPreference;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
