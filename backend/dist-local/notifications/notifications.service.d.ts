import { Repository } from 'typeorm';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { SubscribeUpcomingDto } from './dto/subscribe-upcoming.dto';
import { UpcomingNotification, UpcomingNotificationStatus } from './entities/upcoming-notification.entity';
export type UpcomingSubscriptionResult = {
    id: string;
    userId: string;
    email: string;
    movieId: string;
    cityId: string;
    status: UpcomingNotificationStatus;
    createdAt: string;
};
export type UpcomingDispatchResult = {
    movieId: string;
    notifiedCount: number;
};
export declare class NotificationsService {
    private readonly notificationRepo;
    private readonly movieRepo;
    private readonly cityRepo;
    private readonly logger;
    constructor(notificationRepo: Repository<UpcomingNotification>, movieRepo: Repository<Movie>, cityRepo: Repository<City>);
    subscribeUpcoming(dto: SubscribeUpcomingDto): Promise<UpcomingSubscriptionResult>;
    dispatchUpcomingForMovie(movieId: string): Promise<UpcomingDispatchResult>;
}
