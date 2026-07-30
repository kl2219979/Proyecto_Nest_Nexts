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
exports.MoviesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const billboard_query_dto_1 = require("./dto/billboard-query.dto");
const movie_detail_query_dto_1 = require("./dto/movie-detail-query.dto");
const movie_functions_query_dto_1 = require("./dto/movie-functions-query.dto");
const upcoming_query_dto_1 = require("./dto/upcoming-query.dto");
const movies_service_1 = require("./movies.service");
const showtimes_service_1 = require("./showtimes.service");
let MoviesController = class MoviesController {
    moviesService;
    showtimesService;
    constructor(moviesService, showtimesService) {
        this.moviesService = moviesService;
        this.showtimesService = showtimesService;
    }
    getTodayBillboard(query) {
        return this.moviesService.getTodayBillboard(query);
    }
    getUpcoming(query) {
        return this.moviesService.getUpcoming(query);
    }
    getRecommendations(id, query) {
        return this.moviesService.getRecommendations(id, query);
    }
    getMovieFunctions(id, query) {
        return this.showtimesService.listFunctionsForMovie(id, query);
    }
    getMovieDetail(id, query) {
        return this.moviesService.getMovieDetail(id, query);
    }
    getWeeklyBillboard(query) {
        return this.moviesService.getWeeklyBillboard(query);
    }
};
exports.MoviesController = MoviesController;
__decorate([
    (0, common_1.Get)('today'),
    (0, swagger_1.ApiOperation)({
        summary: 'Cartelera de hoy por ciudad',
        description: 'Misma forma que GET /movies, limitado a funciones del día actual.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Películas con funciones de hoy' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billboard_query_dto_1.BillboardQueryDto]),
    __metadata("design:returntype", Promise)
], MoviesController.prototype, "getTodayBillboard", null);
__decorate([
    (0, common_1.Get)('upcoming'),
    (0, swagger_1.ApiOperation)({
        summary: 'Próximos estrenos por ciudad',
        description: 'RN-017 solo status UPCOMING · RN-018 fecha por ciudad/complejo · orden por releaseDate.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Películas de próximos estrenos' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upcoming_query_dto_1.UpcomingQueryDto]),
    __metadata("design:returntype", Promise)
], MoviesController.prototype, "getUpcoming", null);
__decorate([
    (0, common_1.Get)(':id/recommendations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Películas similares por género',
        description: 'Prioriza títulos con función futura en la ciudad del visitante.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Lista de recomendaciones' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, movie_detail_query_dto_1.MovieDetailQueryDto]),
    __metadata("design:returntype", Promise)
], MoviesController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Get)(':id/functions'),
    (0, swagger_1.ApiOperation)({
        summary: 'Funciones de una película para compra',
        description: 'RN-035 solo futuras · RN-036 solo activas · filtros por fecha/complejo/formato/idioma/audio · facetas para UI.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Listado de funciones seleccionables' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, movie_functions_query_dto_1.MovieFunctionsQueryDto]),
    __metadata("design:returntype", Promise)
], MoviesController.prototype, "getMovieFunctions", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Detalle de película por ciudad',
        description: 'RN-014 solo funciones futuras · RN-015 isSoldOut · RN-016 trailerUrl · también sirve para próximos estrenos.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Ficha completa de la película' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, movie_detail_query_dto_1.MovieDetailQueryDto]),
    __metadata("design:returntype", Promise)
], MoviesController.prototype, "getMovieDetail", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Cartelera semanal (7 días) por ciudad',
        description: 'RN-010 funciones activas · RN-011 filtro available · RN-012 ventana de 7 días.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Películas activas con horarios de la semana' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billboard_query_dto_1.BillboardQueryDto]),
    __metadata("design:returntype", Promise)
], MoviesController.prototype, "getWeeklyBillboard", null);
exports.MoviesController = MoviesController = __decorate([
    (0, swagger_1.ApiTags)('Movies'),
    (0, common_1.Controller)('movies'),
    __metadata("design:paramtypes", [movies_service_1.MoviesService,
        showtimes_service_1.ShowtimesService])
], MoviesController);
//# sourceMappingURL=movies.controller.js.map