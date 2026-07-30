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
exports.ReservationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt/jwt-auth.guard");
const lock_seats_dto_1 = require("./dto/lock-seats.dto");
const seats_service_1 = require("./seats.service");
let ReservationsController = class ReservationsController {
    seatsService;
    constructor(seatsService) {
        this.seatsService = seatsService;
    }
    listMine(user) {
        return this.seatsService.listMyReservations(user.userId);
    }
    release(user, dto = {}) {
        return this.seatsService.releaseSeats(user.userId, dto.reservationId);
    }
};
exports.ReservationsController = ReservationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Reservas de sillas activas del usuario',
        description: 'Incluye resumen (cantidad, unitario, subtotal) antes de continuar al carrito (HU-011).',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Lista de reservas temporales' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'JWT ausente o inválido' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReservationsController.prototype, "listMine", null);
__decorate([
    (0, common_1.Delete)('release-seats'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Liberar sillas bloqueadas',
        description: 'Sin body o sin reservationId libera todos los locks temporales del usuario.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Sillas liberadas' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'JWT ausente o inválido' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, lock_seats_dto_1.ReleaseSeatsDto]),
    __metadata("design:returntype", Promise)
], ReservationsController.prototype, "release", null);
exports.ReservationsController = ReservationsController = __decorate([
    (0, swagger_1.ApiTags)('Reservations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('reservations'),
    __metadata("design:paramtypes", [seats_service_1.SeatsService])
], ReservationsController);
//# sourceMappingURL=reservations.controller.js.map