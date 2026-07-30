import { SubscribeUpcomingDto } from './dto/subscribe-upcoming.dto';
import { NotificationsService, UpcomingSubscriptionResult } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    subscribeUpcoming(dto: SubscribeUpcomingDto): Promise<UpcomingSubscriptionResult>;
}
