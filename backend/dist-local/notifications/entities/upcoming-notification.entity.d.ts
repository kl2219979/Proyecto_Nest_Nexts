import { City } from '../../locations/entities/city.entity';
import { Movie } from '../../movies/entities/movie.entity';
export declare enum UpcomingNotificationStatus {
    PENDING = "PENDING",
    SENT = "SENT"
}
export declare class UpcomingNotification {
    id: string;
    userId: string;
    email: string;
    movieId: string;
    movie: Movie;
    cityId: string;
    city: City;
    status: UpcomingNotificationStatus;
    notifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
