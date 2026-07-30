import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { MembershipDetailResult, MembershipResult, MembershipService } from './membership.service';
export declare class MembershipController {
    private readonly membershipService;
    constructor(membershipService: MembershipService);
    getMine(user: AuthUser): Promise<MembershipDetailResult>;
    create(dto: CreateMembershipDto): Promise<MembershipResult>;
}
