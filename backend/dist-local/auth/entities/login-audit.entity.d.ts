import { User } from './user.entity';
export declare class LoginAudit {
    id: string;
    userId: string | null;
    user: User | null;
    email: string;
    success: boolean;
    failureReason: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}
