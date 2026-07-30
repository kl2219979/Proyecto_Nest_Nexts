import { User } from '../../auth/entities/user.entity';
export declare class Wallet {
    id: string;
    userId: string;
    user: User;
    balance: string;
    createdAt: Date;
    updatedAt: Date;
}
