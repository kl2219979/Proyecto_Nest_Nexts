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
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const country_entity_1 = require("./entities/country.entity");
const department_entity_1 = require("./entities/department.entity");
const city_entity_1 = require("./entities/city.entity");
const cinema_entity_1 = require("./entities/cinema.entity");
let LocationsService = class LocationsService {
    countryRepo;
    departmentRepo;
    cityRepo;
    cinemaRepo;
    constructor(countryRepo, departmentRepo, cityRepo, cinemaRepo) {
        this.countryRepo = countryRepo;
        this.departmentRepo = departmentRepo;
        this.cityRepo = cityRepo;
        this.cinemaRepo = cinemaRepo;
    }
    async findCountries() {
        return this.countryRepo.find({
            order: { name: 'ASC' },
        });
    }
    async findDepartmentsByCountry(countryId) {
        const country = await this.countryRepo.findOne({
            where: { id: countryId },
        });
        if (!country) {
            throw new common_1.NotFoundException(`País no encontrado: ${countryId}`);
        }
        return this.departmentRepo.find({
            where: { countryId },
            order: { name: 'ASC' },
        });
    }
    async findCitiesByDepartment(departmentId) {
        const department = await this.departmentRepo.findOne({
            where: { id: departmentId },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Departamento no encontrado: ${departmentId}`);
        }
        return this.cityRepo
            .createQueryBuilder('city')
            .innerJoin('city.cinemas', 'cinema', 'cinema.isActive = :cinemaActive', {
            cinemaActive: true,
        })
            .where('city.departmentId = :departmentId', { departmentId })
            .andWhere('city.isActive = :cityActive', { cityActive: true })
            .orderBy('city.name', 'ASC')
            .distinct(true)
            .getMany();
    }
    async saveLocationPreference(dto) {
        const city = await this.cityRepo.findOne({
            where: { id: dto.cityId },
            relations: { department: { country: true } },
        });
        if (!city) {
            throw new common_1.NotFoundException(`Ciudad no encontrada: ${dto.cityId}`);
        }
        if (!city.isActive) {
            throw new common_1.BadRequestException('La ciudad seleccionada está inactiva y no puede usarse');
        }
        const cinemas = await this.cinemaRepo.find({
            where: { cityId: city.id, isActive: true },
            order: { name: 'ASC' },
        });
        if (cinemas.length === 0) {
            throw new common_1.BadRequestException('La ciudad debe tener al menos un cine activo (RN-006)');
        }
        return {
            city: {
                id: city.id,
                name: city.name,
                isActive: city.isActive,
                departmentId: city.departmentId,
            },
            department: {
                id: city.department.id,
                name: city.department.name,
                countryId: city.department.countryId,
            },
            country: {
                id: city.department.country.id,
                name: city.department.country.name,
                code: city.department.country.code,
            },
            cinemas: cinemas.map((cinema) => ({
                id: cinema.id,
                name: cinema.name,
                address: cinema.address,
                isActive: cinema.isActive,
            })),
        };
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __param(1, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __param(2, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __param(3, (0, typeorm_1.InjectRepository)(cinema_entity_1.Cinema)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], LocationsService);
//# sourceMappingURL=locations.service.js.map