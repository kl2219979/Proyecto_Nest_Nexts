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
exports.UpcomingNotification = exports.UpcomingNotificationStatus = void 0;
const typeorm_1 = require("typeorm");
const city_entity_1 = require("../../locations/entities/city.entity");
const movie_entity_1 = require("../../movies/entities/movie.entity");
var UpcomingNotificationStatus;
(function (UpcomingNotificationStatus) {
    UpcomingNotificationStatus["PENDING"] = "PENDING";
    UpcomingNotificationStatus["SENT"] = "SENT";
})(UpcomingNotificationStatus || (exports.UpcomingNotificationStatus = UpcomingNotificationStatus = {}));
let UpcomingNotification = class UpcomingNotification {
    id;
    userId;
    email;
    movieId;
    movie;
    cityId;
    city;
    status;
    notifiedAt;
    createdAt;
    updatedAt;
};
exports.UpcomingNotification = UpcomingNotification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UpcomingNotification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UpcomingNotification.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], UpcomingNotification.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UpcomingNotification.prototype, "movieId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => movie_entity_1.Movie, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'movieId' }),
    __metadata("design:type", movie_entity_1.Movie)
], UpcomingNotification.prototype, "movie", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UpcomingNotification.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => city_entity_1.City, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cityId' }),
    __metadata("design:type", city_entity_1.City)
], UpcomingNotification.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UpcomingNotificationStatus,
        default: UpcomingNotificationStatus.PENDING,
    }),
    __metadata("design:type", String)
], UpcomingNotification.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], UpcomingNotification.prototype, "notifiedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UpcomingNotification.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UpcomingNotification.prototype, "updatedAt", void 0);
exports.UpcomingNotification = UpcomingNotification = __decorate([
    (0, typeorm_1.Entity)('upcoming_notifications'),
    (0, typeorm_1.Unique)('uq_upcoming_user_movie', ['userId', 'movieId'])
], UpcomingNotification);
//# sourceMappingURL=upcoming-notification.entity.js.map