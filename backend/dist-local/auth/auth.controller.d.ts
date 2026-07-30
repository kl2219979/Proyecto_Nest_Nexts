import type { Request } from 'express';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ActivateResult, AuthService, AuthTokensResult, RegisterResult } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<RegisterResult>;
    activate(dto: ActivateAccountDto): Promise<ActivateResult>;
    login(dto: LoginDto, req: Request): Promise<AuthTokensResult>;
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
    private clientContext;
}
