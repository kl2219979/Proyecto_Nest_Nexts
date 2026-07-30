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
exports.BillboardQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const movie_enums_1 = require("../enums/movie.enums");
class BillboardQueryDto {
    cityId;
    date;
    genre;
    classification;
    language;
    roomType;
    format;
    cinemaId;
    available;
    audioType;
}
exports.BillboardQueryDto = BillboardQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'UUID de la ciudad (contexto de ubicación)',
        format: 'uuid',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'cityId debe ser un UUID válido' }),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "cityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filtrar un día (YYYY-MM-DD) dentro de la ventana semanal',
        example: '2026-07-30',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'date debe tener formato YYYY-MM-DD',
    }),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Acción' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "genre", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '12+' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "classification", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ES' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: movie_enums_1.RoomType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(movie_enums_1.RoomType, { message: 'roomType inválido' }),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "roomType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: movie_enums_1.MovieFormat }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(movie_enums_1.MovieFormat, { message: 'format inválido' }),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "format", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'cinemaId debe ser un UUID válido' }),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "cinemaId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filtro "Disponible": excluye funciones agotadas (RN-011)',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (value === true || value === 'true' || value === '1') {
            return true;
        }
        if (value === false || value === 'false' || value === '0') {
            return false;
        }
        return value;
    }),
    (0, class_validator_1.IsBoolean)({ message: 'available debe ser boolean' }),
    __metadata("design:type", Boolean)
], BillboardQueryDto.prototype, "available", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: movie_enums_1.AudioType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(movie_enums_1.AudioType),
    __metadata("design:type", String)
], BillboardQueryDto.prototype, "audioType", void 0);
//# sourceMappingURL=billboard-query.dto.js.map