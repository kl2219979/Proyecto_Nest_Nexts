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
exports.MembershipController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt/jwt-auth.guard");
const create_membership_dto_1 = require("./dto/create-membership.dto");
const membership_service_1 = require("./membership.service");
let MembershipController = class MembershipController {
    membershipService;
    constructor(membershipService) {
        this.membershipService = membershipService;
    }
    getMine(user) {
        return this.membershipService.getDetailForUser(user.userId);
    }
    create(dto) {
        return this.membershipService.create(dto);
    }
};
exports.MembershipController = MembershipController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Consultar membresía y beneficios del usuario autenticado',
        description: 'RN-032 descuentos por nivel; RN-033 QR único e intransferible (`qr.payload`).',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Membresía encontrada' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'JWT ausente o inválido' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'El usuario no tiene membresía' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "getMine", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear membresía digital para un usuario',
        description: 'RN-025 / RN-026. Normalmente lo invoca el registro; aquí queda expuesto.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Membresía creada' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'El usuario ya tiene membresía' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Usuario no encontrado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_membership_dto_1.CreateMembershipDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "create", null);
exports.MembershipController = MembershipController = __decorate([
    (0, swagger_1.ApiTags)('Membership'),
    (0, common_1.Controller)('membership'),
    __metadata("design:paramtypes", [membership_service_1.MembershipService])
], MembershipController);
//# sourceMappingURL=membership.controller.js.map