import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { Membership } from './entities/membership.entity';
import { Wallet } from './entities/wallet.entity';
import { MembershipLevel, MembershipStatus } from './enums/membership.enums';
import { MembershipBenefit } from './membership-benefits';
export type MembershipResult = {
    id: string;
    userId: string;
    code: string;
    status: MembershipStatus;
    level: MembershipLevel;
    createdAt: string;
};
export type MembershipDetailResult = {
    id: string;
    userId: string;
    code: string;
    status: MembershipStatus;
    level: MembershipLevel;
    benefits: MembershipBenefit[];
    qr: {
        payload: string;
        transferable: false;
    };
    wallet: {
        balance: string;
    };
    purchaseHistory: [];
    pointsHistory: [];
    activeReservations: [];
    createdAt: string;
};
export declare class MembershipService {
    private readonly membershipRepo;
    private readonly walletRepo;
    private readonly userRepo;
    private readonly dataSource;
    constructor(membershipRepo: Repository<Membership>, walletRepo: Repository<Wallet>, userRepo: Repository<User>, dataSource: DataSource);
    create(dto: CreateMembershipDto): Promise<MembershipResult>;
    createForUser(userId: string): Promise<MembershipResult>;
    findByUserId(userId: string): Promise<Membership | null>;
    getDetailForUser(userId: string): Promise<MembershipDetailResult>;
    persistMembershipAndWallet(userId: string, manager: EntityManager): Promise<MembershipResult>;
    generateUniqueCode(manager?: EntityManager): Promise<string>;
    private toResult;
}
