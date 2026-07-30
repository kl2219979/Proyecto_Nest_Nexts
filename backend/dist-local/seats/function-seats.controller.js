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
exports.FunctionSeatsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/jwt/optional-jwt-auth.guard");
const lock_seats_dto_1 = require("./dto/lock-seats.dto");
const seats_service_1 = require("./seats.service");
let FunctionSeatsController = class FunctionSeatsController {
    seatsService;
    constructor(seatsService) {
        this.seatsService = seatsService;
    }
    getSeats(id, user) {
        return this.seatsService.getSeatMap(id, user?.userId);
    }
    lockSeats(id, user, dto) {
        return this.seatsService.lockSeats(id, user.userId, dto);
    }
};
exports.FunctionSeatsController = FunctionSeatsController;
__decorate([
    (0, common_1.Get)(':id/seats'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Mapa de sillas de una función',
        description: 'Estados AVAILABLE / SELECTED / LOCKED / SOLD / DISABLED · RN-041/043. JWT opcional para marcar SELECTED y mySelection.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Plano con estados' }),
    (0, swagger_1.ApiNotFoundResponse)({
        description: 'Función inexistente, inactiva, iniciada o sin plano',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FunctionSeatsController.prototype, "getSeats", null);
__decorate([
    (0, common_1.Post)(':id/seats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Bloquear sillas temporalmente',
        description: 'RN-039 lock 10 min · RN-041/043 anti doble-venta · RN-042 preferenciales con acknowledgePreferential.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Sillas bloqueadas' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'JWT ausente o inválido' }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Validación, máximo excedido o preferencial sin ack',
    }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Silla ya ocupada (RN-041/043)' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Función no seleccionable' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, lock_seats_dto_1.LockSeatsDto]),
    __metadata("design:returntype", Promise)
], FunctionSeatsController.prototype, "lockSeats", null);
exports.FunctionSeatsController = FunctionSeatsController = __decorate([
    (0, swagger_1.ApiTags)('Functions'),
    (0, common_1.Controller)('functions'),
    __metadata("design:paramtypes", [seats_service_1.SeatsService])
], FunctionSeatsController);
//# sourceMappingURL=function-seats.controller.js.map