import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { DocumentType, UserRole } from '../auth/enums/user.enums';
import { City } from '../locations/entities/city.entity';
import { MembershipService } from '../membership/membership.service';

const BCRYPT_ROUNDS = 10;

/**
 * Cuentas demo del backoffice (HU-020).
 *
 * Solo se crean si no existen por email (idempotente).
 */
export async function seedAdminUsers(
  dataSource: DataSource,
  membershipService: MembershipService,
): Promise<void> {
  const logger = new Logger('AdminSeed');
  const userRepo = dataSource.getRepository(User);
  const profileRepo = dataSource.getRepository(UserProfile);
  const prefsRepo = dataSource.getRepository(NotificationPreference);
  const cityRepo = dataSource.getRepository(City);

  const city = await cityRepo.findOne({ where: { name: 'Medellín' } });
  if (!city) {
    logger.warn(
      'Admin seed omitido: no hay ciudad Medellín (corre seed geo primero)',
    );
    return;
  }

  const accounts: {
    email: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  }[] = [
    {
      email: 'admin@multicine.local',
      password: 'Admin123!',
      role: UserRole.SUPER_ADMIN,
      firstName: 'Admin',
      lastName: 'Multicine',
    },
    {
      email: 'staff@multicine.local',
      password: 'Staff123!',
      role: UserRole.STAFF,
      firstName: 'Staff',
      lastName: 'Puerta',
    },
  ];

  for (const account of accounts) {
    const existing = await userRepo.findOne({
      where: { email: account.email },
    });
    if (existing) {
      if (existing.role !== account.role) {
        existing.role = account.role;
        existing.isActive = true;
        existing.isEmailVerified = true;
        await userRepo.save(existing);
        logger.log(`Rol actualizado: ${account.email} → ${account.role}`);
      }
      continue;
    }

    const user = await userRepo.save(
      userRepo.create({
        email: account.email,
        passwordHash: await bcrypt.hash(account.password, BCRYPT_ROUNDS),
        phone: '3000000000',
        documentType: DocumentType.CC,
        documentNumber: account.role === UserRole.SUPER_ADMIN ? '900001' : '900002',
        role: account.role,
        isEmailVerified: true,
        isActive: true,
        acceptPrivacy: true,
        acceptTerms: true,
        acceptMarketing: false,
        activationToken: null,
        activationTokenExpiresAt: null,
      }),
    );

    await profileRepo.save(
      profileRepo.create({
        userId: user.id,
        firstName: account.firstName,
        lastName: account.lastName,
        birthDate: '1990-01-01',
        gender: null,
        cityId: city.id,
        favoriteCinemaId: null,
        photoUrl: null,
      }),
    );

    await prefsRepo.save(
      prefsRepo.create({
        userId: user.id,
        emailTransactional: true,
        emailMarketing: false,
        emailUpcoming: true,
      }),
    );

    await membershipService.createForUser(user.id);
    logger.log(
      `Usuario admin sembrado: ${account.email} / ${account.password} (${account.role})`,
    );
  }
}
