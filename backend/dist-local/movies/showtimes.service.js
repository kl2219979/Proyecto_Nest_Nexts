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
exports.ShowtimesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const city_entity_1 = require("../locations/entities/city.entity");
const movie_entity_1 = require("./entities/movie.entity");
const showtime_entity_1 = require("./entities/showtime.entity");
let ShowtimesService = class ShowtimesService {
    showtimeRepo;
    movieRepo;
    cityRepo;
    constructor(showtimeRepo, movieRepo, cityRepo) {
        this.showtimeRepo = showtimeRepo;
        this.movieRepo = movieRepo;
        this.cityRepo = cityRepo;
    }
    async listFunctionsForMovie(movieId, query) {
        await this.assertCityExists(query.cityId);
        await this.assertMovieExists(movieId);
        const showtimes = await this.querySelectableShowtimes({
            movieId,
            cityId: query.cityId,
            date: query.date,
            cinemaId: query.cinemaId,
            format: query.format,
            language: query.language,
            audioType: query.audioType,
            roomType: query.roomType,
            availableOnly: query.available === true,
        });
        const functions = showtimes.map((s) => this.toFunctionItem(s));
        return {
            movieId,
            cityId: query.cityId,
            functions,
            facets: this.buildFacets(functions),
        };
    }
    async getFunctionPrices(functionId) {
        const showtime = await this.showtimeRepo
            .createQueryBuilder('showtime')
            .innerJoinAndSelect('showtime.room', 'room')
            .innerJoinAndSelect('room.cinema', 'cinema')
            .where('showtime.id = :functionId', { functionId })
            .getOne();
        if (!showtime) {
            throw new common_1.NotFoundException(`Función no encontrada: ${functionId}`);
        }
        if (!showtime.isActive) {
            throw new common_1.NotFoundException(`La función no está activa (RN-036): ${functionId}`);
        }
        if (showtime.startsAt.getTime() <= Date.now()) {
            throw new common_1.NotFoundException(`La función ya inició y no se puede seleccionar (RN-035): ${functionId}`);
        }
        const basePrice = Number(showtime.price);
        const availableSeats = Math.max(0, showtime.room.capacity - showtime.soldSeats);
        const isSoldOut = availableSeats === 0;
        return {
            functionId: showtime.id,
            movieId: showtime.movieId,
            startsAt: showtime.startsAt.toISOString(),
            format: showtime.format,
            language: showtime.language,
            audioType: showtime.audioType,
            cinema: {
                id: showtime.room.cinema.id,
                name: showtime.room.cinema.name,
            },
            room: {
                id: showtime.room.id,
                name: showtime.room.name,
                roomType: showtime.room.roomType,
            },
            basePrice,
            priceFactors: {
                format: showtime.format,
                roomType: showtime.room.roomType,
                startsAt: showtime.startsAt.toISOString(),
            },
            promotions: [],
            discountTotal: 0,
            finalPrice: basePrice,
            currency: 'COP',
            availableSeats,
            capacity: showtime.room.capacity,
            isSoldOut,
            isSelectable: !isSoldOut,
        };
    }
    async querySelectableShowtimes(filters) {
        const qb = this.showtimeRepo
            .createQueryBuilder('showtime')
            .innerJoinAndSelect('showtime.room', 'room')
            .innerJoinAndSelect('room.cinema', 'cinema')
            .where('showtime.movieId = :movieId', { movieId: filters.movieId })
            .andWhere('showtime.isActive = :active', { active: true })
            .andWhere('cinema.isActive = :cinemaActive', { cinemaActive: true })
            .andWhere('cinema.cityId = :cityId', { cityId: filters.cityId })
            .andWhere('showtime.startsAt > :now', { now: new Date() });
        if (filters.date) {
            const { dayStart, dayEnd } = this.resolveDayBounds(this.parseLocalDate(filters.date));
            qb.andWhere('showtime.startsAt >= :dayStart', { dayStart }).andWhere('showtime.startsAt <= :dayEnd', { dayEnd });
        }
        if (filters.cinemaId) {
            qb.andWhere('cinema.id = :cinemaId', { cinemaId: filters.cinemaId });
        }
        if (filters.format) {
            qb.andWhere('showtime.format = :format', { format: filters.format });
        }
        if (filters.language) {
            qb.andWhere('UPPER(showtime.language) = UPPER(:language)', {
                language: filters.language,
            });
        }
        if (filters.audioType) {
            qb.andWhere('showtime.audioType = :audioType', {
                audioType: filters.audioType,
            });
        }
        if (filters.roomType) {
            qb.andWhere('room.roomType = :roomType', {
                roomType: filters.roomType,
            });
        }
        if (filters.availableOnly) {
            qb.andWhere('showtime.soldSeats < room.capacity');
        }
        return qb.orderBy('showtime.startsAt', 'ASC').getMany();
    }
    toFunctionItem(showtime) {
        const availableSeats = Math.max(0, showtime.room.capacity - showtime.soldSeats);
        const isSoldOut = availableSeats === 0;
        return {
            id: showtime.id,
            startsAt: showtime.startsAt.toISOString(),
            date: this.formatLocalDate(showtime.startsAt),
            format: showtime.format,
            language: showtime.language,
            audioType: showtime.audioType,
            price: Number(showtime.price),
            capacity: showtime.room.capacity,
            soldSeats: showtime.soldSeats,
            availableSeats,
            isSoldOut,
            isSelectable: !isSoldOut,
            cinema: {
                id: showtime.room.cinema.id,
                name: showtime.room.cinema.name,
            },
            room: {
                id: showtime.room.id,
                name: showtime.room.name,
                roomType: showtime.room.roomType,
            },
        };
    }
    buildFacets(functions) {
        const dates = new Set();
        const formats = new Set();
        const languages = new Set();
        const audioTypes = new Set();
        const roomTypes = new Set();
        const cinemas = new Map();
        for (const fn of functions) {
            dates.add(fn.date);
            formats.add(fn.format);
            languages.add(fn.language);
            audioTypes.add(fn.audioType);
            roomTypes.add(fn.room.roomType);
            cinemas.set(fn.cinema.id, fn.cinema.name);
        }
        return {
            dates: [...dates].sort(),
            formats: [...formats].sort((a, b) => a.localeCompare(b)),
            languages: [...languages].sort(),
            audioTypes: [...audioTypes].sort((a, b) => a.localeCompare(b)),
            roomTypes: [...roomTypes].sort((a, b) => a.localeCompare(b)),
            cinemas: [...cinemas.entries()]
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        };
    }
    async assertCityExists(cityId) {
        const city = await this.cityRepo.findOne({
            where: { id: cityId, isActive: true },
        });
        if (!city) {
            throw new common_1.NotFoundException(`Ciudad no encontrada o inactiva: ${cityId}`);
        }
    }
    async assertMovieExists(movieId) {
        const movie = await this.movieRepo.findOne({
            where: { id: movieId, isActive: true },
        });
        if (!movie) {
            throw new common_1.NotFoundException(`Película no encontrada: ${movieId}`);
        }
    }
    formatLocalDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    parseLocalDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    resolveDayBounds(date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return { dayStart, dayEnd };
    }
};
exports.ShowtimesService = ShowtimesService;
exports.ShowtimesService = ShowtimesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(showtime_entity_1.Showtime)),
    __param(1, (0, typeorm_1.InjectRepository)(movie_entity_1.Movie)),
    __param(2, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ShowtimesService);
//# sourceMappingURL=showtimes.service.js.map