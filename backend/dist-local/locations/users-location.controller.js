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
exports.UsersLocationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const locations_service_1 = require("./locations.service");
const save_location_dto_1 = require("./dto/save-location.dto");
let UsersLocationController = class UsersLocationController {
    locationsService;
    constructor(locationsService) {
        this.locationsService = locationsService;
    }
    saveLocation(dto) {
        return this.locationsService.saveLocationPreference(dto);
    }
};
exports.UsersLocationController = UsersLocationController;
__decorate([
    (0, common_1.Post)('location'),
    (0, swagger_1.ApiOperation)({
        summary: 'Guarda/valida la preferencia de ciudad del visitante',
        description: 'Valida RN-006. El frontend debe persistir la respuesta en Local Storage (RN-008).',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Contexto de ubicación y cines activos' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [save_location_dto_1.SaveLocationDto]),
    __metadata("design:returntype", Promise)
], UsersLocationController.prototype, "saveLocation", null);
exports.UsersLocationController = UsersLocationController = __decorate([
    (0, swagger_1.ApiTags)('Locations'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], UsersLocationController);
//# sourceMappingURL=users-location.controller.js.map