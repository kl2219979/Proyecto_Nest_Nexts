import { Gender } from '../../auth/enums/user.enums';
import { UpdateNotificationPreferencesDto } from './update-notification-preferences.dto';
export declare class UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    birthDate?: string;
    gender?: Gender;
    cityId?: string;
    favoriteCinemaId?: string | null;
    photoUrl?: string | null;
    email?: string;
    emailConfirm?: string;
    notificationPreferences?: UpdateNotificationPreferencesDto;
}
