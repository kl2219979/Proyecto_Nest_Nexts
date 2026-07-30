"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const cinema_entity_1 = require("../locations/entities/cinema.entity");
const city_entity_1 = require("../locations/entities/city.entity");
const membership_service_1 = require("../membership/membership.service");
const captcha_service_1 = require("./captcha/captcha.service");
const login_audit_entity_1 = require("./entities/login-audit.entity");
const notification_preference_entity_1 = require("./entities/notification-preference.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const user_profile_entity_1 = require("./entities/user-profile.entity");
const user_entity_1 = require("./entities/user.entity");
const membership_benefits_1 = require("../membership/membership-benefits");
const BCRYPT_ROUNDS = 10;
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
let AuthService = AuthService_1 = class AuthService {
    userRepo;
    profileRepo;
    refreshRepo;
    auditRepo;
    cityRepo;
    cinemaRepo;
    membershipService;
    captchaService;
    jwtService;
    configService;
    dataSource;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(userRepo, profileRepo, refreshRepo, auditRepo, cityRepo, cinemaRepo, membershipService, captchaService, jwtService, configService, dataSource) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.refreshRepo = refreshRepo;
        this.auditRepo = auditRepo;
        this.cityRepo = cityRepo;
        this.cinemaRepo = cinemaRepo;
        this.membershipService = membershipService;
        this.captchaService = captchaService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.dataSource = dataSource;
    }
    async register(dto) {
        this.captchaService.verify(dto.captchaToken);
        const email = dto.email.trim().toLowerCase();
        const duplicate = await this.userRepo.findOne({ where: { email } });
        if (duplicate) {
            throw new common_1.ConflictException('Ya existe una cuenta con este correo electrónico (RN-021)');
        }
        const city = await this.cityRepo.findOne({
            where: { id: dto.cityId, isActive: true },
        });
        if (!city) {
            throw new common_1.NotFoundException(`Ciudad no encontrada: ${dto.cityId}`);
        }
        if (dto.favoriteCinemaId) {
            const cinema = await this.cinemaRepo.findOne({
                where: {
                    id: dto.favoriteCinemaId,
                    cityId: dto.cityId,
                    isActive: true,
                },
            });
            if (!cinema) {
                throw new common_1.BadRequestException('El complejo favorito no pertenece a la ciudad o no está activo');
            }
        }
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const activationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const activationTokenExpiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
        const acceptMarketing = dto.acceptMarketing === true;
        const { user, membership } = await this.dataSource.transaction(async (manager) => {
            const savedUser = await manager.save(user_entity_1.User, manager.create(user_entity_1.User, {
                email,
                passwordHash,
                phone: dto.phone.trim(),
                documentType: dto.documentType,
                documentNumber: dto.documentNumber.trim(),
                isEmailVerified: false,
                isActive: false,
                activationToken,
                activationTokenExpiresAt,
                acceptPrivacy: true,
                acceptTerms: true,
                acceptMarketing,
                failedLoginAttempts: 0,
                lockedUntil: null,
            }));
            await manager.save(user_profile_entity_1.UserProfile, manager.create(user_profile_entity_1.UserProfile, {
                userId: savedUser.id,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                birthDate: dto.birthDate,
                gender: dto.gender ?? null,
                cityId: dto.cityId,
                favoriteCinemaId: dto.favoriteCinemaId ?? null,
            }));
            await manager.save(notification_preference_entity_1.NotificationPreference, manager.create(notification_preference_entity_1.NotificationPreference, {
                userId: savedUser.id,
                emailTransactional: true,
                emailMarketing: acceptMarketing,
                emailUpcoming: true,
            }));
            const savedMembership = await this.membershipService.persistMembershipAndWallet(savedUser.id, manager);
            return { user: savedUser, membership: savedMembership };
        });
        this.dispatchActivationEmail(user.email, activationToken);
        return {
            userId: user.id,
            email: user.email,
            isEmailVerified: false,
            isActive: false,
            membership,
            message: 'Registro exitoso. Revisa tu correo para activar la cuenta (RN-024).',
        };
    }
    async activate(dto) {
        const user = await this.userRepo.findOne({
            where: { activationToken: dto.token },
        });
        if (!user) {
            throw new common_1.BadRequestException('Token de activación inválido');
        }
        if (!user.activationTokenExpiresAt ||
            user.activationTokenExpiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('El token de activación ha expirado (vigencia 24 horas)');
        }
        if (user.isEmailVerified) {
            return {
                userId: user.id,
                email: user.email,
                isEmailVerified: true,
                isActive: user.isActive,
                message: 'La cuenta ya estaba activada',
            };
        }
        user.isEmailVerified = true;
        user.isActive = true;
        user.activationToken = null;
        user.activationTokenExpiresAt = null;
        await this.userRepo.save(user);
        return {
            userId: user.id,
            email: user.email,
            isEmailVerified: true,
            isActive: true,
            message: 'Cuenta activada correctamente',
        };
    }
    async login(dto, ctx) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.userRepo.findOne({ where: { email } });
        if (!user) {
            await this.audit(null, email, false, 'unknown_email', ctx);
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            await this.audit(user.id, email, false, 'locked', ctx);
            throw new common_1.ForbiddenException(`Cuenta bloqueada temporalmente hasta ${user.lockedUntil.toISOString()} (RN-027)`);
        }
        if (!user.isEmailVerified || !user.isActive) {
            await this.audit(user.id, email, false, 'unverified', ctx);
            throw new common_1.ForbiddenException('Debes verificar tu correo antes de iniciar sesión (RN-031)');
        }
        const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordOk) {
            await this.registerFailedAttempt(user, email, ctx);
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await this.userRepo.save(user);
        await this.revokeActiveRefreshTokens(user.id);
        const tokens = await this.issueTokens(user, ctx);
        await this.audit(user.id, email, true, null, ctx);
        return tokens;
    }
    async refresh(dto) {
        const row = await this.findValidRefresh(dto.refreshToken);
        if (!row) {
            throw new common_1.UnauthorizedException('Refresh token inválido o expirado');
        }
        const user = await this.userRepo.findOne({ where: { id: row.userId } });
        if (!user || !user.isActive || !user.isEmailVerified) {
            throw new common_1.UnauthorizedException('Sesión inválida');
        }
        const accessToken = await this.signAccessToken(user);
        return this.buildAuthResult(user, accessToken, dto.refreshToken);
    }
    async logout(dto) {
        const tokenHash = this.hashToken(dto.refreshToken);
        const row = await this.refreshRepo.findOne({ where: { tokenHash } });
        if (row && !row.revokedAt) {
            row.revokedAt = new Date();
            await this.refreshRepo.save(row);
        }
        return { message: 'Sesión cerrada' };
    }
    async forgotPassword(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.userRepo.findOne({ where: { email } });
        if (user && user.isEmailVerified) {
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
            user.passwordResetToken = token;
            user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
            await this.userRepo.save(user);
            this.dispatchPasswordResetEmail(email, token);
        }
        return {
            message: 'Si el correo está registrado, recibirás instrucciones para restablecer la contraseña',
        };
    }
    async resetPassword(dto) {
        const user = await this.userRepo.findOne({
            where: { passwordResetToken: dto.token },
        });
        if (!user ||
            !user.passwordResetExpiresAt ||
            user.passwordResetExpiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Token de recuperación inválido o expirado');
        }
        user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        user.passwordResetToken = null;
        user.passwordResetExpiresAt = null;
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await this.userRepo.save(user);
        await this.revokeActiveRefreshTokens(user.id);
        return { message: 'Contraseña actualizada correctamente' };
    }
    async registerFailedAttempt(user, email, ctx) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
            user.lockedUntil = new Date(Date.now() + LOCK_TTL_MS);
            user.failedLoginAttempts = 0;
            await this.audit(user.id, email, false, 'locked_after_failures', ctx);
        }
        else {
            await this.audit(user.id, email, false, 'bad_password', ctx);
        }
        await this.userRepo.save(user);
    }
    async issueTokens(user, ctx) {
        const accessToken = await this.signAccessToken(user);
        const rawRefresh = (0, crypto_1.randomBytes)(48).toString('hex');
        await this.refreshRepo.save(this.refreshRepo.create({
            userId: user.id,
            tokenHash: this.hashToken(rawRefresh),
            expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
            revokedAt: null,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
        }));
        return this.buildAuthResult(user, accessToken, rawRefresh);
    }
    async signAccessToken(user) {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.signAsync(payload, {
            expiresIn: ACCESS_TTL_SEC,
        });
    }
    async buildAuthResult(user, accessToken, refreshToken) {
        const profile = await this.profileRepo.findOne({
            where: { userId: user.id },
        });
        const membership = await this.membershipService.findByUserId(user.id);
        let membershipSummary = null;
        if (membership) {
            membershipSummary = {
                id: membership.id,
                code: membership.code,
                status: membership.status,
                level: membership.level,
                benefits: (0, membership_benefits_1.benefitsForLevel)(membership.level),
            };
        }
        return {
            accessToken,
            refreshToken,
            expiresIn: ACCESS_TTL_SEC,
            tokenType: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                profile: profile
                    ? {
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        cityId: profile.cityId,
                        favoriteCinemaId: profile.favoriteCinemaId,
                    }
                    : null,
            },
            membership: membershipSummary,
        };
    }
    async findValidRefresh(rawToken) {
        const row = await this.refreshRepo.findOne({
            where: { tokenHash: this.hashToken(rawToken), revokedAt: (0, typeorm_2.IsNull)() },
        });
        if (!row || row.expiresAt.getTime() < Date.now()) {
            return null;
        }
        return row;
    }
    async revokeActiveRefreshTokens(userId) {
        const active = await this.refreshRepo.find({
            where: { userId, revokedAt: (0, typeorm_2.IsNull)() },
        });
        if (active.length === 0) {
            return;
        }
        const now = new Date();
        for (const row of active) {
            row.revokedAt = now;
        }
        await this.refreshRepo.save(active);
    }
    async audit(userId, email, success, failureReason, ctx) {
        await this.auditRepo.save(this.auditRepo.create({
            userId,
            email,
            success,
            failureReason,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
        }));
    }
    hashToken(raw) {
        return (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
    }
    dispatchActivationEmail(email, token) {
        const baseUrl = this.configService.get('APP_PUBLIC_URL', 'http://localhost:3000');
        const link = `${baseUrl}/api/v1/auth/activate?token=${token}`;
        this.logger.log(`Correo de activación (HU-006 → HU-015) → email=${email} link=${link}`);
    }
    dispatchPasswordResetEmail(email, token) {
        const baseUrl = this.configService.get('APP_PUBLIC_URL', 'http://localhost:3000');
        const link = `${baseUrl}/api/v1/auth/reset-password?token=${token}`;
        this.logger.log(`Correo reset password (HU-007 → HU-015) → email=${email} link=${link}`);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_profile_entity_1.UserProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __param(3, (0, typeorm_1.InjectRepository)(login_audit_entity_1.LoginAudit)),
    __param(4, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __param(5, (0, typeorm_1.InjectRepository)(cinema_entity_1.Cinema)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        membership_service_1.MembershipService,
        captcha_service_1.CaptchaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.DataSource])
], AuthService);
//# sourceMappingURL=auth.service.js.map