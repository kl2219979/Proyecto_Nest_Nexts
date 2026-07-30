import { DocumentType } from '../enums/user.enums';
import { UserProfile } from './user-profile.entity';
import { NotificationPreference } from './notification-preference.entity';
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    phone: string;
    documentType: DocumentType;
    documentNumber: string;
    isEmailVerified: boolean;
    isActive: boolean;
    activationToken: string | null;
    activationTokenExpiresAt: Date | null;
    acceptPrivacy: boolean;
    acceptTerms: boolean;
    acceptMarketing: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    passwordResetToken: string | null;
    passwordResetExpiresAt: Date | null;
    profile: UserProfile;
    notificationPreferences: NotificationPreference;
    createdAt: Date;
    updatedAt: Date;
}
