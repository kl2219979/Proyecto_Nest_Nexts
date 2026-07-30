import { MembershipLevel, MembershipStatus } from './enums/membership.enums';
export type MembershipBenefit = {
    code: string;
    description: string;
    discountPercent: number;
};
export declare function benefitsForLevel(level: MembershipLevel): MembershipBenefit[];
export type LoginMembershipSummary = {
    id: string;
    code: string;
    status: MembershipStatus;
    level: MembershipLevel;
    benefits: MembershipBenefit[];
};
