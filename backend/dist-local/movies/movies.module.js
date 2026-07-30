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
var MoviesModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoviesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const city_entity_1 = require("../locations/entities/city.entity");
const cinema_entity_1 = require("../locations/entities/cinema.entity");
const locations_module_1 = require("../locations/locations.module");
const notifications_module_1 = require("../notifications/notifications.module");
const genre_entity_1 = require("./entities/genre.entity");
const movie_entity_1 = require("./entities/movie.entity");
const cast_member_entity_1 = require("./entities/cast-member.entity");
const movie_city_release_entity_1 = require("./entities/movie-city-release.entity");
const room_entity_1 = require("./entities/room.entity");
const showtime_entity_1 = require("./entities/showtime.entity");
const functions_controller_1 = require("./functions.controller");
const movies_controller_1 = require("./movies.controller");
const movies_service_1 = require("./movies.service");
const showtimes_service_1 = require("./showtimes.service");
const movies_seed_1 = require("./movies.seed");
let MoviesModule = MoviesModule_1 = class MoviesModule {
    dataSource;
    logger = new common_1.Logger(MoviesModule_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async onModuleInit() {
        await (0, movies_seed_1.seedMovies)(this.dataSource);
        this.logger.log('Movies seed checked (cartelera/detalle/estrenos demo if empty)');
    }
};
exports.MoviesModule = MoviesModule;
exports.MoviesModule = MoviesModule = MoviesModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [
            locations_module_1.LocationsModule,
            notifications_module_1.NotificationsModule,
            typeorm_1.TypeOrmModule.forFeature([
                movie_entity_1.Movie,
                genre_entity_1.Genre,
                cast_member_entity_1.CastMember,
                movie_city_release_entity_1.MovieCityRelease,
                room_entity_1.Room,
                showtime_entity_1.Showtime,
                city_entity_1.City,
                cinema_entity_1.Cinema,
            ]),
        ],
        controllers: [movies_controller_1.MoviesController, functions_controller_1.FunctionsController],
        providers: [movies_service_1.MoviesService, showtimes_service_1.ShowtimesService],
        exports: [movies_service_1.MoviesService, showtimes_service_1.ShowtimesService],
    }),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], MoviesModule);
//# sourceMappingURL=movies.module.js.map