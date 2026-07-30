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
var LocationsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const country_entity_1 = require("./entities/country.entity");
const department_entity_1 = require("./entities/department.entity");
const city_entity_1 = require("./entities/city.entity");
const cinema_entity_1 = require("./entities/cinema.entity");
const locations_service_1 = require("./locations.service");
const locations_controller_1 = require("./locations.controller");
const users_location_controller_1 = require("./users-location.controller");
const locations_seed_1 = require("./locations.seed");
let LocationsModule = LocationsModule_1 = class LocationsModule {
    dataSource;
    logger = new common_1.Logger(LocationsModule_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async onModuleInit() {
        await (0, locations_seed_1.seedLocations)(this.dataSource);
        this.logger.log('Locations seed checked (Colombia demo data if empty)');
    }
};
exports.LocationsModule = LocationsModule;
exports.LocationsModule = LocationsModule = LocationsModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([country_entity_1.Country, department_entity_1.Department, city_entity_1.City, cinema_entity_1.Cinema])],
        controllers: [locations_controller_1.LocationsController, users_location_controller_1.UsersLocationController],
        providers: [locations_service_1.LocationsService],
        exports: [locations_service_1.LocationsService],
    }),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], LocationsModule);
//# sourceMappingURL=locations.module.js.map