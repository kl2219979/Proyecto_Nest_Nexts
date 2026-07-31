import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { MovieStatus } from '../movies/enums/movie.enums';
import { SubscribeUpcomingDto } from './dto/subscribe-upcoming.dto';
import { EmailService } from './email.service';
import {
  UpcomingNotification,
  UpcomingNotificationStatus,
} from './entities/upcoming-notification.entity';

/**
 * Respuesta de alta de aviso de estreno.
 */
export type UpcomingSubscriptionResult = {
  id: string;
  userId: string;
  email: string;
  movieId: string;
  cityId: string;
  status: UpcomingNotificationStatus;
  createdAt: string;
};

/**
 * Resultado del disparo de avisos al pasar a cartelera (RN-020).
 */
export type UpcomingDispatchResult = {
  movieId: string;
  notifiedCount: number;
};

/**
 * Suscripciones a avisos de próximos estrenos (HU-005) + envío HU-015.
 *
 * Controller → Service → Repository.
 * Al pasar a `NOW_SHOWING` encola correo `UPCOMING_RELEASE` (respeta prefs).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * @param notificationRepo - Solicitudes de aviso.
   * @param movieRepo - Valida película UPCOMING / título.
   * @param cityRepo - Valida ciudad de contexto.
   * @param emailService - Motor de correo (HU-015).
   */
  constructor(
    @InjectRepository(UpcomingNotification)
    private readonly notificationRepo: Repository<UpcomingNotification>,
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Registra “Notificarme cuando esté disponible” (RN-019).
   *
   * @param dto - userId, email, movieId, cityId.
   * @returns Solicitud creada.
   * @throws {NotFoundException} Película/ciudad inválidas o no UPCOMING.
   * @throws {ConflictException} Ya existe aviso para ese usuario + película.
   */
  async subscribeUpcoming(
    dto: SubscribeUpcomingDto,
  ): Promise<UpcomingSubscriptionResult> {
    const city = await this.cityRepo.findOne({ where: { id: dto.cityId } });
    if (!city) {
      throw new NotFoundException(`Ciudad no encontrada: ${dto.cityId}`);
    }

    const movie = await this.movieRepo.findOne({
      where: { id: dto.movieId, isActive: true },
    });
    if (!movie) {
      throw new NotFoundException(`Película no encontrada: ${dto.movieId}`);
    }
    if (movie.status !== MovieStatus.UPCOMING) {
      throw new NotFoundException(
        `La película no es un próximo estreno: ${dto.movieId}`,
      );
    }

    const existing = await this.notificationRepo.findOne({
      where: { userId: dto.userId, movieId: dto.movieId },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe una solicitud de aviso para esta película (RN-019)',
      );
    }

    const saved = await this.notificationRepo.save(
      this.notificationRepo.create({
        userId: dto.userId,
        email: dto.email.toLowerCase(),
        movieId: dto.movieId,
        cityId: dto.cityId,
        status: UpcomingNotificationStatus.PENDING,
        notifiedAt: null,
      }),
    );

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

  /**
   * Dispara avisos pendientes cuando la película entra a cartelera (RN-020).
   *
   * Marca solicitudes `PENDING` → `SENT` y encola correo `UPCOMING_RELEASE`.
   *
   * @param movieId - Película que acaba de pasar a `NOW_SHOWING`.
   * @returns Cantidad de avisos disparados.
   */
  async dispatchUpcomingForMovie(
    movieId: string,
  ): Promise<UpcomingDispatchResult> {
    const pending = await this.notificationRepo.find({
      where: {
        movieId,
        status: UpcomingNotificationStatus.PENDING,
      },
    });

    if (pending.length === 0) {
      return { movieId, notifiedCount: 0 };
    }

    const movie = await this.movieRepo.findOne({ where: { id: movieId } });
    const movieTitle = movie?.title ?? 'Película';

    const now = new Date();
    for (const row of pending) {
      row.status = UpcomingNotificationStatus.SENT;
      row.notifiedAt = now;
      try {
        await this.emailService.sendUpcomingRelease({
          userId: row.userId,
          email: row.email,
          movieId,
          movieTitle,
          cityId: row.cityId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `No se pudo enviar aviso estreno user=${row.userId}: ${msg}`,
        );
      }
    }
    await this.notificationRepo.save(pending);

    return { movieId, notifiedCount: pending.length };
  }
}
