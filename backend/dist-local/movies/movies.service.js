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
exports.MoviesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const city_entity_1 = require("../locations/entities/city.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const movie_entity_1 = require("./entities/movie.entity");
const movie_city_release_entity_1 = require("./entities/movie-city-release.entity");
const showtime_entity_1 = require("./entities/showtime.entity");
const movie_enums_1 = require("./enums/movie.enums");
const BILLBOARD_DAYS = 7;
const MAX_RECOMMENDATIONS = 6;
let MoviesService = class MoviesService {
    movieRepo;
    showtimeRepo;
    cityRepo;
    releaseRepo;
    notificationsService;
    constructor(movieRepo, showtimeRepo, cityRepo, releaseRepo, notificationsService) {
        this.movieRepo = movieRepo;
        this.showtimeRepo = showtimeRepo;
        this.cityRepo = cityRepo;
        this.releaseRepo = releaseRepo;
        this.notificationsService = notificationsService;
    }
    async getWeeklyBillboard(query) {
        return this.buildBillboard(query, false);
    }
    async getTodayBillboard(query) {
        return this.buildBillboard(query, true);
    }
    async getUpcoming(query) {
        await this.assertCityExists(query.cityId);
        const releases = await this.releaseRepo
            .createQueryBuilder('release')
            .innerJoinAndSelect('release.movie', 'movie')
            .leftJoinAndSelect('movie.genres', 'genre')
            .leftJoinAndSelect('release.cinema', 'cinema')
            .where('movie.isActive = :active', { active: true })
            .andWhere('movie.status = :status', { status: movie_enums_1.MovieStatus.UPCOMING })
            .andWhere('release.cityId = :cityId', { cityId: query.cityId })
            .getMany();
        const byMovie = new Map();
        for (const release of releases) {
            const list = byMovie.get(release.movieId) ?? [];
            list.push(release);
            byMovie.set(release.movieId, list);
        }
        const movies = [];
        for (const movieReleases of byMovie.values()) {
            const movie = movieReleases[0].movie;
            const resolved = this.resolveCityReleaseDate(movieReleases);
            if (!resolved) {
                continue;
            }
            movies.push({
                id: movie.id,
                title: movie.title,
                posterUrl: movie.posterUrl,
                trailerUrl: movie.trailerUrl,
                synopsis: movie.synopsis,
                genres: (movie.genres ?? []).map((g) => g.name).sort(),
                classification: movie.classification,
                durationMinutes: movie.durationMinutes,
                releaseDate: resolved.releaseDate,
                daysUntilRelease: this.daysUntil(resolved.releaseDate),
                status: movie.status,
                releasesByCinema: resolved.releasesByCinema,
            });
        }
        movies.sort((a, b) => {
            if (a.releaseDate !== b.releaseDate) {
                return a.releaseDate.localeCompare(b.releaseDate);
            }
            return a.title.localeCompare(b.title);
        });
        return { cityId: query.cityId, movies };
    }
    async promoteToNowShowing(movieId) {
        const movie = await this.movieRepo.findOne({ where: { id: movieId } });
        if (!movie) {
            throw new common_1.NotFoundException(`Película no encontrada: ${movieId}`);
        }
        movie.status = movie_enums_1.MovieStatus.NOW_SHOWING;
        await this.movieRepo.save(movie);
        const dispatch = await this.notificationsService.dispatchUpcomingForMovie(movieId);
        return {
            movieId,
            status: movie.status,
            notifiedCount: dispatch.notifiedCount,
        };
    }
    async getMovieDetail(movieId, query) {
        await this.assertCityExists(query.cityId);
        const movie = await this.movieRepo.findOne({
            where: { id: movieId, isActive: true },
            relations: { genres: true, castMembers: true },
            order: { castMembers: { sortOrder: 'ASC' } },
        });
        if (!movie) {
            throw new common_1.NotFoundException(`Película no encontrada: ${movieId}`);
        }
        const showtimes = await this.findFutureShowtimesForMovie(movieId, query.cityId);
        const detailShowtimes = showtimes.map((s) => this.toDetailShowtime(s));
        const languages = [...new Set(detailShowtimes.map((s) => s.language))];
        const formats = [...new Set(detailShowtimes.map((s) => s.format))];
        const cityReleaseDate = await this.findCityReleaseDate(movieId, query.cityId);
        return {
            id: movie.id,
            title: movie.title,
            posterUrl: movie.posterUrl,
            bannerUrl: movie.bannerUrl,
            trailerUrl: movie.trailerUrl,
            synopsis: movie.synopsis,
            director: movie.director,
            cast: (movie.castMembers ?? []).map((m) => ({
                name: m.name,
                role: m.role,
            })),
            genres: (movie.genres ?? []).map((g) => g.name).sort(),
            durationMinutes: movie.durationMinutes,
            classification: movie.classification,
            releaseDate: cityReleaseDate ?? movie.releaseDate,
            status: movie.status ?? movie_enums_1.MovieStatus.NOW_SHOWING,
            rating: Number(movie.rating),
            isPremiere: movie.isPremiere,
            languages,
            formats,
            pricesByFormat: this.aggregatePricesByFormat(detailShowtimes),
            cityId: query.cityId,
            showtimes: detailShowtimes,
        };
    }
    async getRecommendations(movieId, query) {
        await this.assertCityExists(query.cityId);
        const movie = await this.movieRepo.findOne({
            where: { id: movieId, isActive: true },
            relations: { genres: true },
        });
        if (!movie) {
            throw new common_1.NotFoundException(`Película no encontrada: ${movieId}`);
        }
        const genreIds = (movie.genres ?? []).map((g) => g.id);
        if (genreIds.length === 0) {
            return { movieId, cityId: query.cityId, recommendations: [] };
        }
        const candidates = await this.movieRepo
            .createQueryBuilder('movie')
            .innerJoinAndSelect('movie.genres', 'genre')
            .innerJoin('movie.genres', 'sharedGenre')
            .where('movie.isActive = :active', { active: true })
            .andWhere('movie.status = :status', { status: movie_enums_1.MovieStatus.NOW_SHOWING })
            .andWhere('movie.id != :movieId', { movieId })
            .andWhere('sharedGenre.id IN (:...genreIds)', { genreIds })
            .orderBy('movie.rating', 'DESC')
            .addOrderBy('movie.title', 'ASC')
            .distinct(true)
            .take(MAX_RECOMMENDATIONS * 2)
            .getMany();
        const withShowtimes = await this.movieIdsWithFutureShowtimesInCity(candidates.map((c) => c.id), query.cityId);
        const ranked = [...candidates].sort((a, b) => {
            const aHas = withShowtimes.has(a.id) ? 0 : 1;
            const bHas = withShowtimes.has(b.id) ? 0 : 1;
            if (aHas !== bHas) {
                return aHas - bHas;
            }
            return Number(b.rating) - Number(a.rating);
        });
        const recommendations = ranked
            .slice(0, MAX_RECOMMENDATIONS)
            .map((m) => ({
            id: m.id,
            title: m.title,
            posterUrl: m.posterUrl,
            genres: (m.genres ?? []).map((g) => g.name).sort(),
            classification: m.classification,
            durationMinutes: m.durationMinutes,
            rating: Number(m.rating),
            isPremiere: m.isPremiere,
        }));
        return {
            movieId,
            cityId: query.cityId,
            recommendations,
        };
    }
    async buildBillboard(query, todayOnly) {
        await this.assertCityExists(query.cityId);
        const { from, to, rangeStart, rangeEnd } = this.resolveWeekWindow();
        let dayStart;
        let dayEnd;
        if (todayOnly) {
            ({ dayStart, dayEnd } = this.resolveDayBounds(new Date()));
        }
        else if (query.date) {
            this.assertDateInWindow(query.date, from, to);
            ({ dayStart, dayEnd } = this.resolveDayBounds(this.parseLocalDate(query.date)));
        }
        const showtimes = await this.findShowtimes({
            cityId: query.cityId,
            rangeStart,
            rangeEnd,
            dayStart,
            dayEnd,
            genre: query.genre,
            classification: query.classification,
            language: query.language,
            roomType: query.roomType,
            format: query.format,
            cinemaId: query.cinemaId,
            audioType: query.audioType,
            availableOnly: query.available === true,
        });
        const movies = this.groupByMovie(showtimes);
        return {
            cityId: query.cityId,
            from,
            to,
            movies,
        };
    }
    async assertCityExists(cityId) {
        const city = await this.cityRepo.findOne({ where: { id: cityId } });
        if (!city) {
            throw new common_1.NotFoundException(`Ciudad no encontrada: ${cityId}`);
        }
    }
    resolveCityReleaseDate(releases) {
        if (releases.length === 0) {
            return null;
        }
        const cityLevel = releases.find((r) => r.cinemaId === null);
        const cinemaReleases = releases
            .filter((r) => r.cinemaId !== null && r.cinema)
            .map((r) => ({
            cinemaId: r.cinemaId,
            cinemaName: r.cinema.name,
            releaseDate: r.releaseDate,
        }))
            .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
        let releaseDate = cityLevel?.releaseDate;
        if (!releaseDate && cinemaReleases.length > 0) {
            releaseDate = cinemaReleases[0].releaseDate;
        }
        if (!releaseDate) {
            return null;
        }
        return { releaseDate, releasesByCinema: cinemaReleases };
    }
    async findCityReleaseDate(movieId, cityId) {
        const releases = await this.releaseRepo.find({
            where: { movieId, cityId },
            relations: { cinema: true },
        });
        return this.resolveCityReleaseDate(releases)?.releaseDate ?? null;
    }
    daysUntil(releaseDate) {
        const today = this.formatLocalDate(new Date());
        const todayMs = this.parseLocalDate(today).getTime();
        const releaseMs = this.parseLocalDate(releaseDate).getTime();
        const diff = Math.ceil((releaseMs - todayMs) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    }
    async findFutureShowtimesForMovie(movieId, cityId) {
        return this.showtimeRepo
            .createQueryBuilder('showtime')
            .innerJoinAndSelect('showtime.room', 'room')
            .innerJoinAndSelect('room.cinema', 'cinema')
            .where('showtime.movieId = :movieId', { movieId })
            .andWhere('showtime.isActive = :active', { active: true })
            .andWhere('cinema.isActive = :cinemaActive', { cinemaActive: true })
            .andWhere('cinema.cityId = :cityId', { cityId })
            .andWhere('showtime.startsAt > :now', { now: new Date() })
            .orderBy('showtime.startsAt', 'ASC')
            .getMany();
    }
    async movieIdsWithFutureShowtimesInCity(movieIds, cityId) {
        if (movieIds.length === 0) {
            return new Set();
        }
        const rows = await this.showtimeRepo
            .createQueryBuilder('showtime')
            .innerJoin('showtime.room', 'room')
            .innerJoin('room.cinema', 'cinema')
            .select('DISTINCT showtime.movieId', 'movieId')
            .where('showtime.movieId IN (:...movieIds)', { movieIds })
            .andWhere('showtime.isActive = :active', { active: true })
            .andWhere('cinema.cityId = :cityId', { cityId })
            .andWhere('showtime.startsAt > :now', { now: new Date() })
            .getRawMany();
        return new Set(rows.map((r) => r.movieId));
    }
    toDetailShowtime(showtime) {
        return {
            id: showtime.id,
            startsAt: showtime.startsAt.toISOString(),
            format: showtime.format,
            language: showtime.language,
            audioType: showtime.audioType,
            price: Number(showtime.price),
            isSoldOut: showtime.soldSeats >= showtime.room.capacity,
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
    aggregatePricesByFormat(showtimes) {
        const map = new Map();
        for (const s of showtimes) {
            const current = map.get(s.format);
            if (current === undefined || s.price < current) {
                map.set(s.format, s.price);
            }
        }
        return [...map.entries()]
            .map(([format, price]) => ({ format, price }))
            .sort((a, b) => a.format.localeCompare(b.format));
    }
    resolveWeekWindow() {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + (BILLBOARD_DAYS - 1));
        end.setHours(23, 59, 59, 999);
        return {
            from: this.formatLocalDate(start),
            to: this.formatLocalDate(end),
            rangeStart: start,
            rangeEnd: end,
        };
    }
    resolveDayBounds(date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return { dayStart, dayEnd };
    }
    assertDateInWindow(dateStr, from, to) {
        if (dateStr < from || dateStr > to) {
            throw new common_1.BadRequestException(`date debe estar entre ${from} y ${to} (ventana de ${BILLBOARD_DAYS} días)`);
        }
    }
    async findShowtimes(filters) {
        const qb = this.showtimeRepo
            .createQueryBuilder('showtime')
            .innerJoinAndSelect('showtime.movie', 'movie')
            .leftJoinAndSelect('movie.genres', 'genre')
            .innerJoinAndSelect('showtime.room', 'room')
            .innerJoinAndSelect('room.cinema', 'cinema')
            .where('showtime.isActive = :active', { active: true })
            .andWhere('movie.isActive = :movieActive', { movieActive: true })
            .andWhere('movie.status = :movieStatus', {
            movieStatus: movie_enums_1.MovieStatus.NOW_SHOWING,
        })
            .andWhere('cinema.isActive = :cinemaActive', { cinemaActive: true })
            .andWhere('cinema.cityId = :cityId', { cityId: filters.cityId })
            .andWhere('showtime.startsAt >= :rangeStart', {
            rangeStart: filters.rangeStart,
        })
            .andWhere('showtime.startsAt <= :rangeEnd', {
            rangeEnd: filters.rangeEnd,
        })
            .distinct(true)
            .orderBy('movie.title', 'ASC')
            .addOrderBy('showtime.startsAt', 'ASC');
        if (filters.dayStart && filters.dayEnd) {
            qb.andWhere('showtime.startsAt >= :dayStart', {
                dayStart: filters.dayStart,
            }).andWhere('showtime.startsAt <= :dayEnd', { dayEnd: filters.dayEnd });
        }
        if (filters.genre) {
            qb.innerJoin('movie.genres', 'genreFilter').andWhere('LOWER(genreFilter.name) LIKE LOWER(:genre)', { genre: `%${filters.genre}%` });
        }
        if (filters.classification) {
            qb.andWhere('movie.classification = :classification', {
                classification: filters.classification,
            });
        }
        if (filters.language) {
            qb.andWhere('UPPER(showtime.language) = UPPER(:language)', {
                language: filters.language,
            });
        }
        if (filters.roomType) {
            qb.andWhere('room.roomType = :roomType', {
                roomType: filters.roomType,
            });
        }
        if (filters.format) {
            qb.andWhere('showtime.format = :format', { format: filters.format });
        }
        if (filters.cinemaId) {
            qb.andWhere('cinema.id = :cinemaId', { cinemaId: filters.cinemaId });
        }
        if (filters.audioType) {
            qb.andWhere('showtime.audioType = :audioType', {
                audioType: filters.audioType,
            });
        }
        if (filters.availableOnly) {
            qb.andWhere('showtime.soldSeats < room.capacity');
        }
        return qb.getMany();
    }
    groupByMovie(showtimes) {
        const map = new Map();
        const seenShowtimeIds = new Set();
        for (const showtime of showtimes) {
            if (seenShowtimeIds.has(showtime.id)) {
                continue;
            }
            seenShowtimeIds.add(showtime.id);
            const movie = showtime.movie;
            let card = map.get(movie.id);
            if (!card) {
                card = {
                    id: movie.id,
                    title: movie.title,
                    posterUrl: movie.posterUrl,
                    genres: (movie.genres ?? []).map((g) => g.name).sort(),
                    classification: movie.classification,
                    durationMinutes: movie.durationMinutes,
                    director: movie.director,
                    rating: Number(movie.rating),
                    isPremiere: movie.isPremiere,
                    formats: [],
                    languages: [],
                    audioTypes: [],
                    showtimes: [],
                };
                map.set(movie.id, card);
            }
            const entry = {
                id: showtime.id,
                startsAt: showtime.startsAt.toISOString(),
                format: showtime.format,
                language: showtime.language,
                audioType: showtime.audioType,
                isSoldOut: showtime.soldSeats >= showtime.room.capacity,
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
            card.showtimes.push(entry);
            if (!card.formats.includes(showtime.format)) {
                card.formats.push(showtime.format);
            }
            if (!card.languages.includes(showtime.language)) {
                card.languages.push(showtime.language);
            }
            if (!card.audioTypes.includes(showtime.audioType)) {
                card.audioTypes.push(showtime.audioType);
            }
        }
        return Array.from(map.values());
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
};
exports.MoviesService = MoviesService;
exports.MoviesService = MoviesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(movie_entity_1.Movie)),
    __param(1, (0, typeorm_1.InjectRepository)(showtime_entity_1.Showtime)),
    __param(2, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __param(3, (0, typeorm_1.InjectRepository)(movie_city_release_entity_1.MovieCityRelease)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], MoviesService);
//# sourceMappingURL=movies.service.js.map