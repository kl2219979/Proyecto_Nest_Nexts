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
exports.ReleaseSeatsDto = exports.LockSeatsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class LockSeatsDto {
    seatIds;
    acknowledgePreferential;
}
exports.LockSeatsDto = LockSeatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [String],
        format: 'uuid',
        example: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Debes seleccionar al menos una silla' }),
    (0, class_validator_1.ArrayMaxSize)(20, { message: 'Demasiadas sillas en una sola petición' }),
    (0, class_validator_1.ArrayUnique)({ message: 'Hay sillas duplicadas en la selección' }),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Cada seatId debe ser UUID' }),
    __metadata("design:type", Array)
], LockSeatsDto.prototype, "seatIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Confirma política de movilidad reducida (RN-042) al elegir PREFERENTIAL',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LockSeatsDto.prototype, "acknowledgePreferential", void 0);
class ReleaseSeatsDto {
    reservationId;
}
exports.ReleaseSeatsDto = ReleaseSeatsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'reservationId debe ser UUID' }),
    __metadata("design:type", String)
], ReleaseSeatsDto.prototype, "reservationId", void 0);
//# sourceMappingURL=lock-seats.dto.js.map