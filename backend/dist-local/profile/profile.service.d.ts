import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { DocumentType, Gender } from '../auth/enums/user.enums';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
export type ProfileResult = {
    userId: string;
    email: string;
    isEmailVerified: boolean;
    isActive: boolean;
    phone: string;
    documentType: DocumentType;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: Gender | null;
    cityId: string;
    favoriteCinemaId: string | null;
    photoUrl: string | null;
    notificationPreferences: {
        emailTransactional: boolean;
        emailMarketing: boolean;
        emailUpcoming: boolean;
    };
};
export type UpdateProfileResult = ProfileResult & {
    message: string;
    emailReverificationRequired: boolean;
};
export declare class ProfileService {
    private readonly userRepo;
    private readonly profileRepo;
    private readonly prefsRepo;
    private readonly cityRepo;
    private readonly cinemaRepo;
    private readonly configService;
    private readonly logger;
    constructor(userRepo: Repository<User>, profileRepo: Repository<UserProfile>, prefsRepo: Repository<NotificationPreference>, cityRepo: Repository<City>, cinemaRepo: Repository<Cinema>, configService: ConfigService);
    getProfile(userId: string): Promise<ProfileResult>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<UpdateProfileResult>;
    private loadOwned;
    private validateLocation;
    private dispatchEmailReverification;
    private toResult;
}
