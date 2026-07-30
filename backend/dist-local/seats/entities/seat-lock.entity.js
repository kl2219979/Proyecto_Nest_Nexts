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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatLock = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
const showtime_entity_1 = require("../../movies/entities/showtime.entity");
const seat_enums_1 = require("../enums/seat.enums");
const seat_entity_1 = require("./seat.entity");
let SeatLock = class SeatLock {
    id;
    reservationId;
    showtimeId;
    showtime;
    seatId;
    seat;
    userId;
    user;
    status;
    expiresAt;
    createdAt;
};
exports.SeatLock = SeatLock;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SeatLock.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SeatLock.prototype, "reservationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SeatLock.prototype, "showtimeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => showtime_entity_1.Showtime, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'showtimeId' }),
    __metadata("design:type", showtime_entity_1.Showtime)
], SeatLock.prototype, "showtime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SeatLock.prototype, "seatId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => seat_entity_1.Seat, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'seatId' }),
    __metadata("design:type", seat_entity_1.Seat)
], SeatLock.prototype, "seat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], SeatLock.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", Object)
], SeatLock.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], SeatLock.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SeatLock.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SeatLock.prototype, "createdAt", void 0);
exports.SeatLock = SeatLock = __decorate([
    (0, typeorm_1.Entity)('seat_locks'),
    (0, typeorm_1.Unique)(['showtimeId', 'seatId']),
    (0, typeorm_1.Index)(['userId', 'status']),
    (0, typeorm_1.Index)(['reservationId']),
    (0, typeorm_1.Index)(['expiresAt'])
], SeatLock);
//# sourceMappingURL=seat-lock.entity.js.map