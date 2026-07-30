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
exports.UpdateProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const user_enums_1 = require("../../auth/enums/user.enums");
const match_field_decorator_1 = require("../../auth/validators/match-field.decorator");
const update_notification_preferences_dto_1 = require("./update-notification-preferences.dto");
class UpdateProfileDto {
    firstName;
    lastName;
    phone;
    birthDate;
    gender;
    cityId;
    favoriteCinemaId;
    photoUrl;
    email;
    emailConfirm;
    notificationPreferences;
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Ana' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'García López' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '3001234567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fecha de nacimiento ISO (YYYY-MM-DD)',
        example: '1995-04-12',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: user_enums_1.Gender }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(user_enums_1.Gender),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ciudad principal (contexto cartelera)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "cityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Complejo favorito; `null` lo limpia',
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], UpdateProfileDto.prototype, "favoriteCinemaId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL de fotografía (opcional); `null` la limpia',
        nullable: true,
        example: 'https://cdn.example.com/avatars/ana.jpg',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null && value !== undefined),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdateProfileDto.prototype, "photoUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nuevo correo (RN-034: requiere re-activación)',
        example: 'ana.nueva@example.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Confirmación del nuevo correo (obligatoria si envía email)',
        example: 'ana.nueva@example.com',
    }),
    (0, class_validator_1.ValidateIf)((o) => o.email !== undefined),
    (0, class_validator_1.IsEmail)(),
    (0, match_field_decorator_1.MatchField)('email', {
        message: 'emailConfirm debe coincidir con email',
    }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "emailConfirm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: update_notification_preferences_dto_1.UpdateNotificationPreferencesDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => update_notification_preferences_dto_1.UpdateNotificationPreferencesDto),
    __metadata("design:type", update_notification_preferences_dto_1.UpdateNotificationPreferencesDto)
], UpdateProfileDto.prototype, "notificationPreferences", void 0);
//# sourceMappingURL=update-profile.dto.js.map