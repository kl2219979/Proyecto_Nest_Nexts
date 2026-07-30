import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResult, ProfileService, UpdateProfileResult } from './profile.service';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getProfile(user: AuthUser): Promise<ProfileResult>;
    updateProfile(user: AuthUser, dto: UpdateProfileDto): Promise<UpdateProfileResult>;
}
