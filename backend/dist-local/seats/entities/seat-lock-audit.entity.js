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
exports.SeatLockAudit = void 0;
const typeorm_1 = require("typeorm");
const seat_enums_1 = require("../enums/seat.enums");
let SeatLockAudit = class SeatLockAudit {
    id;
    showtimeId;
    seatId;
    userId;
    reservationId;
    action;
    createdAt;
};
exports.SeatLockAudit = SeatLockAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SeatLockAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SeatLockAudit.prototype, "showtimeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SeatLockAudit.prototype, "seatId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], SeatLockAudit.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], SeatLockAudit.prototype, "reservationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], SeatLockAudit.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SeatLockAudit.prototype, "createdAt", void 0);
exports.SeatLockAudit = SeatLockAudit = __decorate([
    (0, typeorm_1.Entity)('seat_lock_audits'),
    (0, typeorm_1.Index)(['showtimeId', 'createdAt']),
    (0, typeorm_1.Index)(['reservationId'])
], SeatLockAudit);
//# sourceMappingURL=seat-lock-audit.entity.js.map