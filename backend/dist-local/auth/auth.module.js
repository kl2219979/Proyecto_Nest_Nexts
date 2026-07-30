"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const typeorm_1 = require("@nestjs/typeorm");
const cinema_entity_1 = require("../locations/entities/cinema.entity");
const city_entity_1 = require("../locations/entities/city.entity");
const membership_module_1 = require("../membership/membership.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const captcha_service_1 = require("./captcha/captcha.service");
const login_audit_entity_1 = require("./entities/login-audit.entity");
const notification_preference_entity_1 = require("./entities/notification-preference.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const user_profile_entity_1 = require("./entities/user-profile.entity");
const user_entity_1 = require("./entities/user.entity");
const jwt_auth_guard_1 = require("./jwt/jwt-auth.guard");
const jwt_strategy_1 = require("./jwt/jwt.strategy");
const optional_jwt_auth_guard_1 = require("./jwt/optional-jwt-auth.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                user_profile_entity_1.UserProfile,
                notification_preference_entity_1.NotificationPreference,
                refresh_token_entity_1.RefreshToken,
                login_audit_entity_1.LoginAudit,
                city_entity_1.City,
                cinema_entity_1.Cinema,
            ]),
            (0, common_1.forwardRef)(() => membership_module_1.MembershipModule),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET', 'dev-jwt-secret-change-me'),
                    signOptions: {
                        expiresIn: 15 * 60,
                    },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, captcha_service_1.CaptchaService, jwt_strategy_1.JwtStrategy, jwt_auth_guard_1.JwtAuthGuard, optional_jwt_auth_guard_1.OptionalJwtAuthGuard],
        exports: [auth_service_1.AuthService, jwt_1.JwtModule, passport_1.PassportModule, jwt_auth_guard_1.JwtAuthGuard, optional_jwt_auth_guard_1.OptionalJwtAuthGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map