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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt/jwt-auth.guard");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const profile_service_1 = require("./profile.service");
let ProfileController = class ProfileController {
    profileService;
    constructor(profileService) {
        this.profileService = profileService;
    }
    getProfile(user) {
        return this.profileService.getProfile(user.userId);
    }
    updateProfile(user, dto) {
        return this.profileService.updateProfile(user.userId, dto);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Consultar perfil del usuario autenticado',
        description: 'Información personal, foto opcional y preferencias de notificación (HU-008).',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Perfil encontrado' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'JWT ausente o inválido' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Usuario o perfil inexistente' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar perfil y preferencias',
        description: 'RN-034: cambio de email exige re-activación vía `POST /auth/activate`.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Perfil actualizado' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'JWT ausente o inválido' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Validación o ubicación inválida' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Email duplicado (RN-021)' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Usuario o perfil inexistente' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateProfile", null);
exports.ProfileController = ProfileController = __decorate([
    (0, swagger_1.ApiTags)('Profile'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('profile'),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map