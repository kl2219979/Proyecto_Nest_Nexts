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
exports.LocationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const locations_service_1 = require("./locations.service");
let LocationsController = class LocationsController {
    locationsService;
    constructor(locationsService) {
        this.locationsService = locationsService;
    }
    findCountries() {
        return this.locationsService.findCountries();
    }
    findDepartments(countryId) {
        return this.locationsService.findDepartmentsByCountry(countryId);
    }
    findCities(departmentId) {
        return this.locationsService.findCitiesByDepartment(departmentId);
    }
};
exports.LocationsController = LocationsController;
__decorate([
    (0, common_1.Get)('countries'),
    (0, swagger_1.ApiOperation)({ summary: 'Lista países' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Países ordenados por nombre' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "findCountries", null);
__decorate([
    (0, common_1.Get)('departments/:countryId'),
    (0, swagger_1.ApiOperation)({ summary: 'Lista departamentos de un país' }),
    (0, swagger_1.ApiParam)({ name: 'countryId', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Departamentos del país' }),
    __param(0, (0, common_1.Param)('countryId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "findDepartments", null);
__decorate([
    (0, common_1.Get)('cities/:departmentId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Lista ciudades con al menos un cine activo',
        description: 'Aplica RN-006: omite ciudades inactivas y ciudades sin cines activos.',
    }),
    (0, swagger_1.ApiParam)({ name: 'departmentId', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Ciudades filtradas del departamento' }),
    __param(0, (0, common_1.Param)('departmentId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "findCities", null);
exports.LocationsController = LocationsController = __decorate([
    (0, swagger_1.ApiTags)('Locations'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], LocationsController);
//# sourceMappingURL=locations.controller.js.map