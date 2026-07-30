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
exports.Movie = void 0;
const typeorm_1 = require("typeorm");
const movie_enums_1 = require("../enums/movie.enums");
const cast_member_entity_1 = require("./cast-member.entity");
const genre_entity_1 = require("./genre.entity");
const movie_city_release_entity_1 = require("./movie-city-release.entity");
const showtime_entity_1 = require("./showtime.entity");
let Movie = class Movie {
    id;
    title;
    posterUrl;
    bannerUrl;
    trailerUrl;
    synopsis;
    releaseDate;
    classification;
    durationMinutes;
    director;
    rating;
    isPremiere;
    status;
    isActive;
    genres;
    castMembers;
    cityReleases;
    showtimes;
};
exports.Movie = Movie;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Movie.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Movie.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], Movie.prototype, "posterUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "bannerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "trailerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "synopsis", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "releaseDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], Movie.prototype, "classification", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Movie.prototype, "durationMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 160 }),
    __metadata("design:type", String)
], Movie.prototype, "director", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 1, default: 0 }),
    __metadata("design:type", Number)
], Movie.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Movie.prototype, "isPremiere", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: movie_enums_1.MovieStatus,
        default: movie_enums_1.MovieStatus.NOW_SHOWING,
    }),
    __metadata("design:type", String)
], Movie.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Movie.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => genre_entity_1.Genre, (genre) => genre.movies, { cascade: true }),
    (0, typeorm_1.JoinTable)({ name: 'movie_genres' }),
    __metadata("design:type", Array)
], Movie.prototype, "genres", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => cast_member_entity_1.CastMember, (member) => member.movie, { cascade: true }),
    __metadata("design:type", Array)
], Movie.prototype, "castMembers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => movie_city_release_entity_1.MovieCityRelease, (release) => release.movie, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Movie.prototype, "cityReleases", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => showtime_entity_1.Showtime, (showtime) => showtime.movie),
    __metadata("design:type", Array)
], Movie.prototype, "showtimes", void 0);
exports.Movie = Movie = __decorate([
    (0, typeorm_1.Entity)('movies')
], Movie);
//# sourceMappingURL=movie.entity.js.map