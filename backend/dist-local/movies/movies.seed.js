"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMovies = seedMovies;
const cinema_entity_1 = require("../locations/entities/cinema.entity");
const city_entity_1 = require("../locations/entities/city.entity");
const cast_member_entity_1 = require("./entities/cast-member.entity");
const genre_entity_1 = require("./entities/genre.entity");
const movie_entity_1 = require("./entities/movie.entity");
const movie_city_release_entity_1 = require("./entities/movie-city-release.entity");
const room_entity_1 = require("./entities/room.entity");
const showtime_entity_1 = require("./entities/showtime.entity");
const movie_enums_1 = require("./enums/movie.enums");
async function seedMovies(dataSource) {
    const movieRepo = dataSource.getRepository(movie_entity_1.Movie);
    if ((await movieRepo.count()) > 0) {
        return;
    }
    const cinemaRepo = dataSource.getRepository(cinema_entity_1.Cinema);
    const cityRepo = dataSource.getRepository(city_entity_1.City);
    const genreRepo = dataSource.getRepository(genre_entity_1.Genre);
    const castRepo = dataSource.getRepository(cast_member_entity_1.CastMember);
    const roomRepo = dataSource.getRepository(room_entity_1.Room);
    const showtimeRepo = dataSource.getRepository(showtime_entity_1.Showtime);
    const releaseRepo = dataSource.getRepository(movie_city_release_entity_1.MovieCityRelease);
    const laureles = await cinemaRepo.findOne({
        where: { name: 'Multicine Laureles' },
    });
    const premium = await cinemaRepo.findOne({
        where: { name: 'Multicine Premium Plaza' },
    });
    const andino = await cinemaRepo.findOne({
        where: { name: 'Multicine Andino' },
    });
    const medellin = await cityRepo.findOne({ where: { name: 'Medellín' } });
    const bogota = await cityRepo.findOne({ where: { name: 'Bogotá' } });
    if (!laureles || !premium || !andino || !medellin || !bogota) {
        return;
    }
    const accion = genreRepo.create({ name: 'Acción' });
    const aventura = genreRepo.create({ name: 'Aventura' });
    const drama = genreRepo.create({ name: 'Drama' });
    const animacion = genreRepo.create({ name: 'Animación' });
    const terror = genreRepo.create({ name: 'Terror' });
    const comedia = genreRepo.create({ name: 'Comedia' });
    await genreRepo.save([accion, aventura, drama, animacion, terror, comedia]);
    const odisea = movieRepo.create({
        title: 'Odisea Estelar',
        posterUrl: 'https://cdn.multicine.local/posters/odisea-estelar.jpg',
        bannerUrl: 'https://cdn.multicine.local/banners/odisea-estelar.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        synopsis: 'Una tripulación intergaláctica busca un nuevo hogar tras el colapso de su planeta. Acción y asombro en cada salto hiperespacial.',
        releaseDate: '2026-07-01',
        classification: '12+',
        durationMinutes: 142,
        director: 'Ana Restrepo',
        rating: 8.4,
        isPremiere: true,
        status: movie_enums_1.MovieStatus.NOW_SHOWING,
        isActive: true,
        genres: [accion, aventura],
    });
    const rio = movieRepo.create({
        title: 'Río Silencioso',
        posterUrl: 'https://cdn.multicine.local/posters/rio-silencioso.jpg',
        bannerUrl: 'https://cdn.multicine.local/banners/rio-silencioso.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=oHg5SJYRHA0',
        synopsis: 'Drama intimista sobre una familia que redescubre sus raíces a orillas de un río que está a punto de desaparecer.',
        releaseDate: '2026-05-15',
        classification: '15+',
        durationMinutes: 118,
        director: 'Carlos Mejía',
        rating: 7.9,
        isPremiere: false,
        status: movie_enums_1.MovieStatus.NOW_SHOWING,
        isActive: true,
        genres: [drama],
    });
    const pixel = movieRepo.create({
        title: 'Pixel Heroes',
        posterUrl: 'https://cdn.multicine.local/posters/pixel-heroes.jpg',
        bannerUrl: 'https://cdn.multicine.local/banners/pixel-heroes.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        synopsis: 'Un grupo de héroes de 8 bits salta del cartucho a la vida real para salvar el arcade del barrio.',
        releaseDate: '2026-07-20',
        classification: 'T',
        durationMinutes: 95,
        director: 'Laura Gómez',
        rating: 8.1,
        isPremiere: true,
        status: movie_enums_1.MovieStatus.NOW_SHOWING,
        isActive: true,
        genres: [animacion, aventura],
    });
    const inactiveBillboard = movieRepo.create({
        title: 'Archivo Oscuro (sin funciones)',
        posterUrl: 'https://cdn.multicine.local/posters/archivo-oscuro.jpg',
        bannerUrl: 'https://cdn.multicine.local/banners/archivo-oscuro.jpg',
        trailerUrl: null,
        synopsis: 'Película de catálogo sin funciones en la ventana demo.',
        releaseDate: '2025-11-01',
        classification: '18+',
        durationMinutes: 110,
        director: 'N/A',
        rating: 6.0,
        isPremiere: false,
        status: movie_enums_1.MovieStatus.NOW_SHOWING,
        isActive: true,
        genres: [drama],
    });
    const nocturna = movieRepo.create({
        title: 'Nocturna del Caribe',
        posterUrl: 'https://cdn.multicine.local/posters/nocturna-caribe.jpg',
        bannerUrl: 'https://cdn.multicine.local/banners/nocturna-caribe.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
        synopsis: 'Un faro abandonado guarda el secreto de una tormenta que nunca termina. Terror atmosférico en el Caribe colombiano.',
        releaseDate: '2026-09-15',
        classification: '15+',
        durationMinutes: 108,
        director: 'Elena Vargas',
        rating: 0,
        isPremiere: false,
        status: movie_enums_1.MovieStatus.UPCOMING,
        isActive: true,
        genres: [terror, drama],
    });
    const risa = movieRepo.create({
        title: 'Risa Contagiosa',
        posterUrl: 'https://cdn.multicine.local/posters/risa-contagiosa.jpg',
        bannerUrl: 'https://cdn.multicine.local/banners/risa-contagiosa.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        synopsis: 'Dos stand-uperos rivales deben compartir escenario en una gira que saldrá muy mal… o muy bien.',
        releaseDate: '2026-10-01',
        classification: '12+',
        durationMinutes: 102,
        director: 'Miguel Soto',
        rating: 0,
        isPremiere: false,
        status: movie_enums_1.MovieStatus.UPCOMING,
        isActive: true,
        genres: [comedia],
    });
    await movieRepo.save([odisea, rio, pixel, inactiveBillboard, nocturna, risa]);
    await castRepo.save([
        castRepo.create({
            movieId: odisea.id,
            name: 'Diego Vargas',
            role: 'Capitán Nova',
            sortOrder: 0,
        }),
        castRepo.create({
            movieId: odisea.id,
            name: 'María Quintero',
            role: 'Dra. Kepler',
            sortOrder: 1,
        }),
        castRepo.create({
            movieId: odisea.id,
            name: 'Sofía Ríos',
            role: 'IA Orión',
            sortOrder: 2,
        }),
        castRepo.create({
            movieId: rio.id,
            name: 'Andrés Peña',
            role: 'Tomás',
            sortOrder: 0,
        }),
        castRepo.create({
            movieId: rio.id,
            name: 'Camila Ortiz',
            role: 'Elena',
            sortOrder: 1,
        }),
        castRepo.create({
            movieId: pixel.id,
            name: 'Voz: Julián Cruz',
            role: 'Pixel',
            sortOrder: 0,
        }),
        castRepo.create({
            movieId: pixel.id,
            name: 'Voz: Valentina Díaz',
            role: 'Bit',
            sortOrder: 1,
        }),
        castRepo.create({
            movieId: nocturna.id,
            name: 'Isabel Mora',
            role: 'Farera',
            sortOrder: 0,
        }),
        castRepo.create({
            movieId: risa.id,
            name: 'Pedro Nieto',
            role: 'Lucho',
            sortOrder: 0,
        }),
    ]);
    await releaseRepo.save([
        releaseRepo.create({
            movieId: nocturna.id,
            cityId: medellin.id,
            cinemaId: null,
            releaseDate: '2026-09-15',
        }),
        releaseRepo.create({
            movieId: nocturna.id,
            cityId: medellin.id,
            cinemaId: laureles.id,
            releaseDate: '2026-09-14',
        }),
        releaseRepo.create({
            movieId: nocturna.id,
            cityId: medellin.id,
            cinemaId: premium.id,
            releaseDate: '2026-09-16',
        }),
        releaseRepo.create({
            movieId: nocturna.id,
            cityId: bogota.id,
            cinemaId: null,
            releaseDate: '2026-09-22',
        }),
        releaseRepo.create({
            movieId: risa.id,
            cityId: medellin.id,
            cinemaId: null,
            releaseDate: '2026-10-01',
        }),
        releaseRepo.create({
            movieId: risa.id,
            cityId: bogota.id,
            cinemaId: null,
            releaseDate: '2026-10-08',
        }),
    ]);
    const sala1 = roomRepo.create({
        name: 'Sala 1',
        roomType: movie_enums_1.RoomType.STANDARD,
        capacity: 120,
        cinemaId: laureles.id,
    });
    const salaImax = roomRepo.create({
        name: 'IMAX 1',
        roomType: movie_enums_1.RoomType.IMAX,
        capacity: 200,
        cinemaId: laureles.id,
    });
    const salaVip = roomRepo.create({
        name: 'VIP 1',
        roomType: movie_enums_1.RoomType.VIP,
        capacity: 40,
        cinemaId: premium.id,
    });
    const salaBogota = roomRepo.create({
        name: 'Sala 3',
        roomType: movie_enums_1.RoomType.STANDARD,
        capacity: 150,
        cinemaId: andino.id,
    });
    await roomRepo.save([sala1, salaImax, salaVip, salaBogota]);
    const today = startOfLocalDay(new Date());
    const showtimes = [
        showtimeRepo.create({
            movieId: odisea.id,
            roomId: sala1.id,
            startsAt: atHour(today, 14),
            format: movie_enums_1.MovieFormat.TWO_D,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 10,
            price: 18000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: odisea.id,
            roomId: salaImax.id,
            startsAt: atHour(today, 18),
            format: movie_enums_1.MovieFormat.IMAX,
            language: 'EN',
            audioType: movie_enums_1.AudioType.SUBTITLED,
            soldSeats: 50,
            price: 32000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: odisea.id,
            roomId: salaVip.id,
            startsAt: atHour(addDays(today, 1), 20),
            format: movie_enums_1.MovieFormat.VIP,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 5,
            price: 45000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: odisea.id,
            roomId: sala1.id,
            startsAt: atHour(today, 21),
            format: movie_enums_1.MovieFormat.THREE_D,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 120,
            price: 22000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: rio.id,
            roomId: sala1.id,
            startsAt: atHour(today, 16),
            format: movie_enums_1.MovieFormat.TWO_D,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 20,
            price: 17000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: rio.id,
            roomId: salaVip.id,
            startsAt: atHour(addDays(today, 2), 19),
            format: movie_enums_1.MovieFormat.VIP,
            language: 'EN',
            audioType: movie_enums_1.AudioType.SUBTITLED,
            soldSeats: 8,
            price: 42000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: pixel.id,
            roomId: sala1.id,
            startsAt: atHour(today, 11),
            format: movie_enums_1.MovieFormat.TWO_D,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 30,
            price: 15000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: pixel.id,
            roomId: salaImax.id,
            startsAt: atHour(addDays(today, 3), 15),
            format: movie_enums_1.MovieFormat.IMAX,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 12,
            price: 28000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: odisea.id,
            roomId: salaBogota.id,
            startsAt: atHour(today, 17),
            format: movie_enums_1.MovieFormat.TWO_D,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 40,
            price: 19000,
            isActive: true,
        }),
        showtimeRepo.create({
            movieId: rio.id,
            roomId: sala1.id,
            startsAt: atHour(addDays(today, 1), 10),
            format: movie_enums_1.MovieFormat.TWO_D,
            language: 'ES',
            audioType: movie_enums_1.AudioType.DUBBED,
            soldSeats: 0,
            price: 17000,
            isActive: false,
        }),
    ];
    await showtimeRepo.save(showtimes);
}
function startOfLocalDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function atHour(day, hour) {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    return d;
}
//# sourceMappingURL=movies.seed.js.map