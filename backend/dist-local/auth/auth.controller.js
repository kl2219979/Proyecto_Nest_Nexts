"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const activate_account_dto_1 = require("./dto/activate-account.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const login_dto_1 = require("./dto/login.dto");
const logout_dto_1 = require("./dto/logout.dto");
const refresh_dto_1 = require("./dto/refresh.dto");
const register_dto_1 = require("./dto/register.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    register(dto) {
        return this.authService.register(dto);
    }
    activate(dto) {
        return this.authService.activate(dto);
    }
    login(dto, req) {
        return this.authService.login(dto, this.clientContext(req));
    }
    refresh(dto) {
        return this.authService.refresh(dto);
    }
    logout(dto) {
        return this.authService.logout(dto);
    }
    forgotPassword(dto) {
        return this.authService.forgotPassword(dto);
    }
    resetPassword(dto) {
        return this.authService.resetPassword(dto);
    }
    clientContext(req) {
        const forwarded = req.headers['x-forwarded-for'];
        const forwardedIp = Array.isArray(forwarded)
            ? forwarded[0]
            : forwarded?.split(',')[0]?.trim();
        return {
            ipAddress: forwardedIp || req.ip || null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar usuario y crear membresía digital',
        description: 'RN-021…026. Cuenta inactiva hasta `POST /auth/activate`. CAPTCHA obligatorio.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Usuario y membresía creados' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Email duplicado (RN-021)' }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Validación, CAPTCHA o contraseña débil',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Activar cuenta con token de correo',
        description: 'Token válido 24 horas. Tras activar, la cuenta puede hacer login (HU-007).',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Cuenta activada' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Token inválido o expirado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activate_account_dto_1.ActivateAccountDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Iniciar sesión',
        description: 'RN-027…031. Emite Access JWT (15 min) y Refresh (7 días). Solo cuentas verificadas.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Tokens y datos de sesión' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Credenciales inválidas' }),
    (0, swagger_1.ApiForbiddenResponse)({
        description: 'Cuenta bloqueada o email no verificado',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Renovar Access Token',
        description: 'Usa el Refresh Token vigente (7 días) para obtener un Access nuevo.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Nuevo Access Token' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Refresh inválido o expirado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Cerrar sesión',
        description: 'Revoca el Refresh Token indicado.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Sesión cerrada' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [logout_dto_1.LogoutDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Olvidé mi contraseña',
        description: 'Si el email existe y está verificado, registra token de reset (log hasta HU-015).',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Mensaje genérico' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Restablecer contraseña',
        description: 'Aplica nueva contraseña (RN-022/023) e invalida sesiones activas.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Contraseña actualizada' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Token inválido o password débil' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map