import { City } from '../../locations/entities/city.entity';
import { Cinema } from '../../locations/entities/cinema.entity';
import { Gender } from '../enums/user.enums';
import { User } from './user.entity';
export declare class UserProfile {
    id: string;
    userId: string;
    user: User;
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: Gender | null;
    cityId: string;
    city: City;
    favoriteCinemaId: string | null;
    favoriteCinema: Cinema | null;
    photoUrl: string | null;
}
