import { User } from '../../auth/entities/user.entity';
import { MembershipLevel, MembershipStatus } from '../enums/membership.enums';
export declare class Membership {
    id: string;
    userId: string;
    user: User;
    code: string;
    status: MembershipStatus;
    level: MembershipLevel;
    createdAt: Date;
    updatedAt: Date;
}
