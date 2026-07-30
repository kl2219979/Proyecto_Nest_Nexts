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
exports.RegisterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const user_enums_1 = require("../enums/user.enums");
const is_strong_password_decorator_1 = require("../validators/is-strong-password.decorator");
const match_field_decorator_1 = require("../validators/match-field.decorator");
class RegisterDto {
    firstName;
    lastName;
    documentType;
    documentNumber;
    birthDate;
    gender;
    email;
    emailConfirm;
    phone;
    password;
    passwordConfirm;
    cityId;
    favoriteCinemaId;
    acceptPrivacy;
    acceptTerms;
    acceptMarketing;
    captchaToken;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ana' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'García López' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: user_enums_1.DocumentType, example: user_enums_1.DocumentType.CC }),
    (0, class_validator_1.IsEnum)(user_enums_1.DocumentType),
    __metadata("design:type", String)
], RegisterDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1234567890' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], RegisterDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Fecha de nacimiento ISO (YYYY-MM-DD)',
        example: '1995-04-12',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: user_enums_1.Gender }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(user_enums_1.Gender),
    __metadata("design:type", String)
], RegisterDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ana.garcia@example.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ana.garcia@example.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, match_field_decorator_1.MatchField)('email', {
        message: 'emailConfirm debe coincidir con email',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "emailConfirm", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3001234567' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        minLength: 10,
        example: 'Segura123!',
        description: 'Mín. 10 chars; mayúscula, minúscula, número y especial',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10, {
        message: 'La contraseña debe tener mínimo 10 caracteres (RN-022)',
    }),
    (0, is_strong_password_decorator_1.IsStrongPassword)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Segura123!' }),
    (0, class_validator_1.IsString)(),
    (0, match_field_decorator_1.MatchField)('password', {
        message: 'passwordConfirm debe coincidir con password',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "passwordConfirm", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ciudad principal (UUID de locations)',
        format: 'uuid',
    }),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], RegisterDto.prototype, "cityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Complejo favorito (opcional)',
        format: 'uuid',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], RegisterDto.prototype, "favoriteCinemaId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Aceptación tratamiento de datos' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.Equals)(true, { message: 'Debe aceptar el tratamiento de datos personales' }),
    __metadata("design:type", Boolean)
], RegisterDto.prototype, "acceptPrivacy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Aceptación términos y condiciones' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.Equals)(true, { message: 'Debe aceptar los términos y condiciones' }),
    __metadata("design:type", Boolean)
], RegisterDto.prototype, "acceptTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Comunicaciones comerciales (opcional)',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RegisterDto.prototype, "acceptMarketing", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token CAPTCHA (en dev: valor de CAPTCHA_DEV_TOKEN)',
        example: 'dev-ok',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'captchaToken es obligatorio' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "captchaToken", void 0);
//# sourceMappingURL=register.dto.js.map