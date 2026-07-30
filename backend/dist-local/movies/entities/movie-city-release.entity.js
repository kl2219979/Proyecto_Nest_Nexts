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
exports.MovieCityRelease = void 0;
const typeorm_1 = require("typeorm");
const cinema_entity_1 = require("../../locations/entities/cinema.entity");
const city_entity_1 = require("../../locations/entities/city.entity");
const movie_entity_1 = require("./movie.entity");
let MovieCityRelease = class MovieCityRelease {
    id;
    movieId;
    movie;
    cityId;
    city;
    cinemaId;
    cinema;
    releaseDate;
};
exports.MovieCityRelease = MovieCityRelease;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MovieCityRelease.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], MovieCityRelease.prototype, "movieId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => movie_entity_1.Movie, (movie) => movie.cityReleases, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'movieId' }),
    __metadata("design:type", movie_entity_1.Movie)
], MovieCityRelease.prototype, "movie", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], MovieCityRelease.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => city_entity_1.City, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cityId' }),
    __metadata("design:type", city_entity_1.City)
], MovieCityRelease.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MovieCityRelease.prototype, "cinemaId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cinema_entity_1.Cinema, { onDelete: 'CASCADE', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'cinemaId' }),
    __metadata("design:type", Object)
], MovieCityRelease.prototype, "cinema", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], MovieCityRelease.prototype, "releaseDate", void 0);
exports.MovieCityRelease = MovieCityRelease = __decorate([
    (0, typeorm_1.Entity)('movie_city_releases'),
    (0, typeorm_1.Unique)('uq_movie_city_cinema_release', ['movieId', 'cityId', 'cinemaId'])
], MovieCityRelease);
//# sourceMappingURL=movie-city-release.entity.js.map