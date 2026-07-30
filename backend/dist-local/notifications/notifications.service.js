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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const city_entity_1 = require("../locations/entities/city.entity");
const movie_entity_1 = require("../movies/entities/movie.entity");
const movie_enums_1 = require("../movies/enums/movie.enums");
const upcoming_notification_entity_1 = require("./entities/upcoming-notification.entity");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    notificationRepo;
    movieRepo;
    cityRepo;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(notificationRepo, movieRepo, cityRepo) {
        this.notificationRepo = notificationRepo;
        this.movieRepo = movieRepo;
        this.cityRepo = cityRepo;
    }
    async subscribeUpcoming(dto) {
        const city = await this.cityRepo.findOne({ where: { id: dto.cityId } });
        if (!city) {
            throw new common_1.NotFoundException(`Ciudad no encontrada: ${dto.cityId}`);
        }
        const movie = await this.movieRepo.findOne({
            where: { id: dto.movieId, isActive: true },
        });
        if (!movie) {
            throw new common_1.NotFoundException(`Película no encontrada: ${dto.movieId}`);
        }
        if (movie.status !== movie_enums_1.MovieStatus.UPCOMING) {
            throw new common_1.NotFoundException(`La película no es un próximo estreno: ${dto.movieId}`);
        }
        const existing = await this.notificationRepo.findOne({
            where: { userId: dto.userId, movieId: dto.movieId },
        });
        if (existing) {
            throw new common_1.ConflictException('Ya existe una solicitud de aviso para esta película (RN-019)');
        }
        const saved = await this.notificationRepo.save(this.notificationRepo.create({
            userId: dto.userId,
            email: dto.email.toLowerCase(),
            movieId: dto.movieId,
            cityId: dto.cityId,
            status: upcoming_notification_entity_1.UpcomingNotificationStatus.PENDING,
            notifiedAt: null,
        }));
        return {
            id: saved.id,
            userId: saved.userId,
            email: saved.email,
            movieId: saved.movieId,
            cityId: saved.cityId,
            status: saved.status,
            createdAt: saved.createdAt.toISOString(),
        };
    }
    async dispatchUpcomingForMovie(movieId) {
        const pending = await this.notificationRepo.find({
            where: {
                movieId,
                status: upcoming_notification_entity_1.UpcomingNotificationStatus.PENDING,
            },
        });
        if (pending.length === 0) {
            return { movieId, notifiedCount: 0 };
        }
        const now = new Date();
        for (const row of pending) {
            row.status = upcoming_notification_entity_1.UpcomingNotificationStatus.SENT;
            row.notifiedAt = now;
            this.logger.log(`RN-020 aviso estreno → user=${row.userId} email=${row.email} movie=${movieId} city=${row.cityId}`);
        }
        await this.notificationRepo.save(pending);
        return { movieId, notifiedCount: pending.length };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(upcoming_notification_entity_1.UpcomingNotification)),
    __param(1, (0, typeorm_1.InjectRepository)(movie_entity_1.Movie)),
    __param(2, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map