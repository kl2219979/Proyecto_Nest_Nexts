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
var SeatsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const auth_module_1 = require("../auth/auth.module");
const optional_jwt_auth_guard_1 = require("../auth/jwt/optional-jwt-auth.guard");
const showtime_entity_1 = require("../movies/entities/showtime.entity");
const movies_module_1 = require("../movies/movies.module");
const seat_lock_audit_entity_1 = require("./entities/seat-lock-audit.entity");
const seat_lock_entity_1 = require("./entities/seat-lock.entity");
const seat_entity_1 = require("./entities/seat.entity");
const function_seats_controller_1 = require("./function-seats.controller");
const reservations_controller_1 = require("./reservations.controller");
const seats_seed_1 = require("./seats.seed");
const seats_service_1 = require("./seats.service");
let SeatsModule = SeatsModule_1 = class SeatsModule {
    dataSource;
    logger = new common_1.Logger(SeatsModule_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async onModuleInit() {
        await (0, seats_seed_1.seedSeats)(this.dataSource);
        this.logger.log('Seats seed checked (room layouts + sold demo if empty)');
    }
};
exports.SeatsModule = SeatsModule;
exports.SeatsModule = SeatsModule = SeatsModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            movies_module_1.MoviesModule,
            typeorm_1.TypeOrmModule.forFeature([seat_entity_1.Seat, seat_lock_entity_1.SeatLock, seat_lock_audit_entity_1.SeatLockAudit, showtime_entity_1.Showtime]),
        ],
        controllers: [function_seats_controller_1.FunctionSeatsController, reservations_controller_1.ReservationsController],
        providers: [seats_service_1.SeatsService, optional_jwt_auth_guard_1.OptionalJwtAuthGuard],
        exports: [seats_service_1.SeatsService],
    }),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SeatsModule);
//# sourceMappingURL=seats.module.js.map