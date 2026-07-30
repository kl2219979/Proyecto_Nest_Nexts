import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { City } from '../locations/entities/city.entity';
import { MembershipResult, MembershipService } from '../membership/membership.service';
import { CaptchaService } from './captcha/captcha.service';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ClientContext, LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginAudit } from './entities/login-audit.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { LoginMembershipSummary } from '../membership/membership-benefits';
export type RegisterResult = {
    userId: string;
    email: string;
    isEmailVerified: boolean;
    isActive: boolean;
    membership: MembershipResult;
    message: string;
};
export type ActivateResult = {
    userId: string;
    email: string;
    isEmailVerified: boolean;
    isActive: boolean;
    message: string;
};
export type LoginProfileSummary = {
    firstName: string;
    lastName: string;
    cityId: string;
    favoriteCinemaId: string | null;
};
export type AuthTokensResult = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
    user: {
        id: string;
        email: string;
        profile: LoginProfileSummary | null;
    };
    membership: LoginMembershipSummary | null;
};
export declare class AuthService {
    private readonly userRepo;
    private readonly profileRepo;
    private readonly refreshRepo;
    private readonly auditRepo;
    private readonly cityRepo;
    private readonly cinemaRepo;
    private readonly membershipService;
    private readonly captchaService;
    private readonly jwtService;
    private readonly configService;
    private readonly dataSource;
    private readonly logger;
    constructor(userRepo: Repository<User>, profileRepo: Repository<UserProfile>, refreshRepo: Repository<RefreshToken>, auditRepo: Repository<LoginAudit>, cityRepo: Repository<City>, cinemaRepo: Repository<Cinema>, membershipService: MembershipService, captchaService: CaptchaService, jwtService: JwtService, configService: ConfigService, dataSource: DataSource);
    register(dto: RegisterDto): Promise<RegisterResult>;
    activate(dto: ActivateAccountDto): Promise<ActivateResult>;
    login(dto: LoginDto, ctx: ClientContext): Promise<AuthTokensResult>;
    refresh(dto: RefreshDto): Promise<AuthTokensResult>;
    logout(dto: LogoutDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private registerFailedAttempt;
    private issueTokens;
    private signAccessToken;
    private buildAuthResult;
    private findValidRefresh;
    private revokeActiveRefreshTokens;
    private audit;
    private hashToken;
    private dispatchActivationEmail;
    private dispatchPasswordResetEmail;
}
