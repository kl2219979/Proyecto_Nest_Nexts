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
exports.ResetPasswordDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const is_strong_password_decorator_1 = require("../validators/is-strong-password.decorator");
const match_field_decorator_1 = require("../validators/match-field.decorator");
class ResetPasswordDto {
    token;
    password;
    passwordConfirm;
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Token recibido por correo (forgot-password)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        minLength: 10,
        example: 'NuevaSegura123!',
        description: 'Misma política RN-022 / RN-023',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10, {
        message: 'La contraseña debe tener mínimo 10 caracteres (RN-022)',
    }),
    (0, is_strong_password_decorator_1.IsStrongPassword)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'NuevaSegura123!' }),
    (0, class_validator_1.IsString)(),
    (0, match_field_decorator_1.MatchField)('password', {
        message: 'passwordConfirm debe coincidir con password',
    }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "passwordConfirm", void 0);
//# sourceMappingURL=reset-password.dto.js.map