import { DataSource } from 'typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { CastMember } from './entities/cast-member.entity';
import { Genre } from './entities/genre.entity';
import { Movie } from './entities/movie.entity';
import { Room } from './entities/room.entity';
import { Showtime } from './entities/showtime.entity';
import { AudioType, MovieFormat, RoomType } from './enums/movie.enums';

/**
 * Inserta cartelera + fichas demo (HU-003 / HU-004).
 *
 * Depende del seed de locations (cines de Medellín / Bogotá).
 * Idempotente: si ya hay películas, no vuelve a insertar.
 *
 * Incluye:
 * - función **agotada** (RN-011 / RN-015)
 * - función **inactiva** (RN-010)
 * - banner, tráiler, sinopsis, elenco y precios por formato (HU-004)
 *
 * @param dataSource - Conexión TypeORM ya inicializada.
 * @returns {Promise<void>}
 */
export async function seedMovies(dataSource: DataSource): Promise<void> {
  const movieRepo = dataSource.getRepository(Movie);
  if ((await movieRepo.count()) > 0) {
    return;
  }

  const cinemaRepo = dataSource.getRepository(Cinema);
  const genreRepo = dataSource.getRepository(Genre);
  const castRepo = dataSource.getRepository(CastMember);
  const roomRepo = dataSource.getRepository(Room);
  const showtimeRepo = dataSource.getRepository(Showtime);

  const laureles = await cinemaRepo.findOne({
    where: { name: 'Multicine Laureles' },
  });
  const premium = await cinemaRepo.findOne({
    where: { name: 'Multicine Premium Plaza' },
  });
  const andino = await cinemaRepo.findOne({
    where: { name: 'Multicine Andino' },
  });

  if (!laureles || !premium || !andino) {
    return;
  }

  const accion = genreRepo.create({ name: 'Acción' });
  const aventura = genreRepo.create({ name: 'Aventura' });
  const drama = genreRepo.create({ name: 'Drama' });
  const animacion = genreRepo.create({ name: 'Animación' });
  await genreRepo.save([accion, aventura, drama, animacion]);

  const odisea = movieRepo.create({
    title: 'Odisea Estelar',
    posterUrl: 'https://cdn.multicine.local/posters/odisea-estelar.jpg',
    bannerUrl: 'https://cdn.multicine.local/banners/odisea-estelar.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    synopsis:
      'Una tripulación intergaláctica busca un nuevo hogar tras el colapso de su planeta. Acción y asombro en cada salto hiperespacial.',
    releaseDate: '2026-07-01',
    classification: '12+',
    durationMinutes: 142,
    director: 'Ana Restrepo',
    rating: 8.4,
    isPremiere: true,
    isActive: true,
    genres: [accion, aventura],
  });

  const rio = movieRepo.create({
    title: 'Río Silencioso',
    posterUrl: 'https://cdn.multicine.local/posters/rio-silencioso.jpg',
    bannerUrl: 'https://cdn.multicine.local/banners/rio-silencioso.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=oHg5SJYRHA0',
    synopsis:
      'Drama intimista sobre una familia que redescubre sus raíces a orillas de un río que está a punto de desaparecer.',
    releaseDate: '2026-05-15',
    classification: '15+',
    durationMinutes: 118,
    director: 'Carlos Mejía',
    rating: 7.9,
    isPremiere: false,
    isActive: true,
    genres: [drama],
  });

  const pixel = movieRepo.create({
    title: 'Pixel Heroes',
    posterUrl: 'https://cdn.multicine.local/posters/pixel-heroes.jpg',
    bannerUrl: 'https://cdn.multicine.local/banners/pixel-heroes.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    synopsis:
      'Un grupo de héroes de 8 bits salta del cartucho a la vida real para salvar el arcade del barrio.',
    releaseDate: '2026-07-20',
    classification: 'T',
    durationMinutes: 95,
    director: 'Laura Gómez',
    rating: 8.1,
    isPremiere: true,
    isActive: true,
    genres: [animacion, aventura],
  });

  /** Activa pero sin funciones → no sale en cartelera; sí puede consultarse en detalle. */
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
    isActive: true,
    genres: [drama],
  });

  await movieRepo.save([odisea, rio, pixel, inactiveBillboard]);

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
  ]);

  const sala1 = roomRepo.create({
    name: 'Sala 1',
    roomType: RoomType.STANDARD,
    capacity: 120,
    cinemaId: laureles.id,
  });
  const salaImax = roomRepo.create({
    name: 'IMAX 1',
    roomType: RoomType.IMAX,
    capacity: 200,
    cinemaId: laureles.id,
  });
  const salaVip = roomRepo.create({
    name: 'VIP 1',
    roomType: RoomType.VIP,
    capacity: 40,
    cinemaId: premium.id,
  });
  const salaBogota = roomRepo.create({
    name: 'Sala 3',
    roomType: RoomType.STANDARD,
    capacity: 150,
    cinemaId: andino.id,
  });
  await roomRepo.save([sala1, salaImax, salaVip, salaBogota]);

  const today = startOfLocalDay(new Date());

  const showtimes: Showtime[] = [
    showtimeRepo.create({
      movieId: odisea.id,
      roomId: sala1.id,
      startsAt: atHour(today, 14),
      format: MovieFormat.TWO_D,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 10,
      price: 18000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: odisea.id,
      roomId: salaImax.id,
      startsAt: atHour(today, 18),
      format: MovieFormat.IMAX,
      language: 'EN',
      audioType: AudioType.SUBTITLED,
      soldSeats: 50,
      price: 32000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: odisea.id,
      roomId: salaVip.id,
      startsAt: atHour(addDays(today, 1), 20),
      format: MovieFormat.VIP,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 5,
      price: 45000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: odisea.id,
      roomId: sala1.id,
      startsAt: atHour(today, 21),
      format: MovieFormat.THREE_D,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 120,
      price: 22000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: rio.id,
      roomId: sala1.id,
      startsAt: atHour(today, 16),
      format: MovieFormat.TWO_D,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 20,
      price: 17000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: rio.id,
      roomId: salaVip.id,
      startsAt: atHour(addDays(today, 2), 19),
      format: MovieFormat.VIP,
      language: 'EN',
      audioType: AudioType.SUBTITLED,
      soldSeats: 8,
      price: 42000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: pixel.id,
      roomId: sala1.id,
      startsAt: atHour(today, 11),
      format: MovieFormat.TWO_D,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 30,
      price: 15000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: pixel.id,
      roomId: salaImax.id,
      startsAt: atHour(addDays(today, 3), 15),
      format: MovieFormat.IMAX,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 12,
      price: 28000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: odisea.id,
      roomId: salaBogota.id,
      startsAt: atHour(today, 17),
      format: MovieFormat.TWO_D,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 40,
      price: 19000,
      isActive: true,
    }),
    showtimeRepo.create({
      movieId: rio.id,
      roomId: sala1.id,
      startsAt: atHour(addDays(today, 1), 10),
      format: MovieFormat.TWO_D,
      language: 'ES',
      audioType: AudioType.DUBBED,
      soldSeats: 0,
      price: 17000,
      isActive: false,
    }),
  ];

  await showtimeRepo.save(showtimes);
}

/**
 * Medianoche local del día de `date`.
 *
 * @param date - Fecha base.
 */
function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Suma días a una fecha local.
 *
 * @param date - Fecha base.
 * @param days - Días a sumar.
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Construye un Date a una hora fija del día.
 *
 * @param day - Día (medianoche).
 * @param hour - Hora 0–23.
 */
function atHour(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}
