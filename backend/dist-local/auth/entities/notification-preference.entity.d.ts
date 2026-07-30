import { User } from './user.entity';
export declare class NotificationPreference {
    id: string;
    userId: string;
    user: User;
    emailTransactional: boolean;
    emailMarketing: boolean;
    emailUpcoming: boolean;
}
