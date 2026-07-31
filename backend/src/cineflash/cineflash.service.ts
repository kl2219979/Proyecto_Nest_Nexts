import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationPreference } from '../auth/entities/notification-preference.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../notifications/email.service';
import { Showtime } from '../movies/entities/showtime.entity';
import { DiscountKind, PromotionType } from '../promotions/enums/promotion.enums';
import { Promotion } from '../promotions/entities/promotion.entity';
import {
  CINE_FLASH_CODE_PREFIX,
  CINE_FLASH_DISCOUNT_PERCENT,
  CINE_FLASH_LEAD_HOURS,
  CINE_FLASH_MAX_TICKETS,
  CINE_FLASH_OCCUPANCY_THRESHOLD,
  CINE_FLASH_WINDOW_MS,
} from './cineflash.constants';
import {
  CineFlashFunctionItem,
  CineFlashListResponse,
  CineFlashProcessResult,
} from './dto/cineflash-response';
import { CineFlashAudit } from './entities/cineflash-audit.entity';
import {
  CineFlashAuditAction,
  CineFlashAuditReason,
} from './enums/cineflash.enums';

/**
 * Motor de Cine Flash — promoción inteligente automática (HU-019).
 *
 * Cada ~5 min (cron o `POST /cineflash/process`):
 * 1. Apaga flashes vencidos / salas llenas (RN-084).
 * 2. Activa 20% OFF en funciones a ~1 h con ocupación &lt; 60% (RN-080…083).
 * 3. Audita (RN-085) y notifica email + push stub (RN-086).
 *
 * @remarks
 * **Patrón:** Service (Nest) + Scheduled Job.
 * Problema que resuelve: automatizar campañas de último minuto sin
 * intervención humana, reutilizando el motor de `Promotion` (HU-026).
 */
@Injectable()
export class CineflashService {
  private readonly logger = new Logger(CineflashService.name);

  /**
   * @param showtimeRepo - Funciones + sala/cine/película.
   * @param promoRepo - Promociones CINE_FLASH por showtime.
   * @param auditRepo - Bitácora RN-085.
   * @param userRepo - Destinatarios de email.
   * @param profileRepo - Ciudad favorita del socio.
   * @param prefsRepo - Preferencias marketing.
   * @param emailService - Motor HU-015.
   */
  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(Promotion)
    private readonly promoRepo: Repository<Promotion>,
    @InjectRepository(CineFlashAudit)
    private readonly auditRepo: Repository<CineFlashAudit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(NotificationPreference)
    private readonly prefsRepo: Repository<NotificationPreference>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Ejecuta una pasada completa: desactivar + activar + notificar.
   *
   * @returns Resumen de la corrida.
   */
  async process(): Promise<CineFlashProcessResult> {
    const deactivated = await this.deactivateExpiredOrFull();
    const activated = await this.activateEligible();

    let emailsQueued = 0;
    let pushStubbed = 0;
    for (const item of activated) {
      const notified = await this.notifyActivation(item.showtime, item.promo);
      emailsQueued += notified.emails;
      pushStubbed += notified.push;
    }

    return {
      evaluated: deactivated.evaluated + activated.length,
      activated: activated.length,
      deactivated: deactivated.count,
      emailsQueued,
      pushStubbed,
      activatedShowtimeIds: activated.map((a) => a.showtime.id),
      deactivatedShowtimeIds: deactivated.showtimeIds,
    };
  }

  /**
   * Lista funciones con Cine Flash vigente (`GET /movies/cineflash`).
   *
   * @param cityId - Filtro opcional por ciudad del complejo.
   * @returns Funciones en flash con precio tachado / flash.
   */
  async listActive(cityId?: string): Promise<CineFlashListResponse> {
    const now = new Date();
    const qb = this.promoRepo
      .createQueryBuilder('p')
      .where('p.type = :type', { type: PromotionType.CINE_FLASH })
      .andWhere('p.isActive = true')
      .andWhere('p.startsAt <= :now', { now })
      .andWhere('p.endsAt >= :now', { now })
      .andWhere('p.showtimeId IS NOT NULL');

    const promos = await qb.getMany();
    if (promos.length === 0) {
      return { cityId: cityId ?? null, count: 0, items: [] };
    }

    const showtimeIds = promos
      .map((p) => p.showtimeId)
      .filter((id): id is string => Boolean(id));

    const showtimes = await this.showtimeRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.movie', 'movie')
      .innerJoinAndSelect('s.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('s.id IN (:...ids)', { ids: showtimeIds })
      .andWhere('s.isActive = true')
      .andWhere('s.startsAt > :now', { now })
      .getMany();

    const byId = new Map(showtimes.map((s) => [s.id, s]));
    const items: CineFlashFunctionItem[] = [];

    for (const promo of promos) {
      if (!promo.showtimeId) continue;
      const showtime = byId.get(promo.showtimeId);
      if (!showtime) continue;
      if (cityId && showtime.room.cinema.cityId !== cityId) continue;

      const capacity = showtime.room.capacity;
      const occupancyPercent = this.occupancyPercent(
        showtime.soldSeats,
        capacity,
      );
      const basePrice = Number(showtime.price);
      const flashPrice = this.roundMoney(
        basePrice * (1 - CINE_FLASH_DISCOUNT_PERCENT / 100),
      );

      items.push({
        functionId: showtime.id,
        movieId: showtime.movieId,
        movieTitle: showtime.movie.title,
        bannerUrl: showtime.movie.bannerUrl ?? null,
        posterUrl: showtime.movie.posterUrl ?? null,
        startsAt: showtime.startsAt.toISOString(),
        format: showtime.format,
        language: showtime.language,
        cinemaId: showtime.room.cinema.id,
        cinemaName: showtime.room.cinema.name,
        cityId: showtime.room.cinema.cityId,
        roomId: showtime.room.id,
        roomName: showtime.room.name,
        capacity,
        soldSeats: showtime.soldSeats,
        availableSeats: Math.max(0, capacity - showtime.soldSeats),
        occupancyPercent,
        basePrice,
        flashPrice,
        discountPercent: CINE_FLASH_DISCOUNT_PERCENT,
        maxTickets: CINE_FLASH_MAX_TICKETS,
        promotionId: promo.id,
        promoCode: promo.code,
        badge: 'CINE_FLASH',
        tagline: '🔥 Cine Flash · 20% OFF · Solo por tiempo limitado',
      });
    }

    items.sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

    return {
      cityId: cityId ?? null,
      count: items.length,
      items,
    };
  }

  /**
   * Apaga promociones CINE_FLASH cuya función ya inició o está llena (RN-084).
   */
  private async deactivateExpiredOrFull(): Promise<{
    count: number;
    evaluated: number;
    showtimeIds: string[];
  }> {
    const now = new Date();
    const active = await this.promoRepo.find({
      where: {
        type: PromotionType.CINE_FLASH,
        isActive: true,
      },
    });

    const showtimeIds: string[] = [];
    let evaluated = 0;

    for (const promo of active) {
      if (!promo.showtimeId) {
        promo.isActive = false;
        await this.promoRepo.save(promo);
        continue;
      }

      evaluated += 1;
      const showtime = await this.showtimeRepo.findOne({
        where: { id: promo.showtimeId },
        relations: { room: true },
      });
      if (!showtime) {
        promo.isActive = false;
        await this.promoRepo.save(promo);
        continue;
      }

      const capacity = showtime.room.capacity;
      const soldOut = showtime.soldSeats >= capacity;
      const started = showtime.startsAt.getTime() <= now.getTime();

      if (!soldOut && !started) {
        continue;
      }

      const reason = started
        ? CineFlashAuditReason.SHOWTIME_STARTED
        : CineFlashAuditReason.SOLD_OUT;

      await this.deactivatePromo(promo, showtime, reason);
      showtimeIds.push(showtime.id);
    }

    return { count: showtimeIds.length, evaluated, showtimeIds };
  }

  /**
   * Activa Cine Flash en funciones dentro de la ventana de 1 h (RN-080…083).
   */
  private async activateEligible(): Promise<
    Array<{ showtime: Showtime; promo: Promotion }>
  > {
    const now = Date.now();
    const target = now + CINE_FLASH_LEAD_HOURS * 60 * 60 * 1000;
    const from = new Date(target - CINE_FLASH_WINDOW_MS);
    const to = new Date(target + CINE_FLASH_WINDOW_MS);

    const candidates = await this.showtimeRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.movie', 'movie')
      .innerJoinAndSelect('s.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('s.isActive = true')
      .andWhere('s.startsAt BETWEEN :from AND :to', { from, to })
      .getMany();

    const results: Array<{ showtime: Showtime; promo: Promotion }> = [];

    for (const showtime of candidates) {
      const existing = await this.promoRepo.findOne({
        where: {
          type: PromotionType.CINE_FLASH,
          showtimeId: showtime.id,
          isActive: true,
        },
      });
      if (existing) {
        continue;
      }

      const capacity = showtime.room.capacity;
      if (capacity <= 0) {
        continue;
      }
      const ratio = showtime.soldSeats / capacity;
      if (ratio >= CINE_FLASH_OCCUPANCY_THRESHOLD) {
        continue;
      }

      const promo = await this.createFlashPromo(showtime);
      results.push({ showtime, promo });
    }

    return results;
  }

  /**
   * Crea la promo CINE_FLASH, limita a 3 entradas y audita (RN-081…085).
   */
  private async createFlashPromo(showtime: Showtime): Promise<Promotion> {
    const now = new Date();
    const code = `${CINE_FLASH_CODE_PREFIX}${showtime.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const previousMax = showtime.maxSeatsPerOrder;

    const promo = this.promoRepo.create({
      code,
      name: `🔥 Cine Flash — ${showtime.movie.title}`,
      description:
        '20% OFF solo entradas · máximo 3 · no acumulable · tiempo limitado',
      type: PromotionType.CINE_FLASH,
      discountKind: DiscountKind.PERCENT,
      discountValue: CINE_FLASH_DISCOUNT_PERCENT,
      stackable: false,
      startsAt: now,
      endsAt: showtime.startsAt,
      maxUsesPerUser: null,
      maxTotalUses: null,
      isActive: true,
      requiresCode: false,
      cityId: showtime.room.cinema.cityId,
      cinemaId: showtime.room.cinema.id,
      roomId: showtime.room.id,
      movieId: showtime.movieId,
      genreId: null,
      format: showtime.format,
      showtimeId: showtime.id,
      appliesToTickets: true,
      appliesToSnacks: false,
      minMembershipLevel: null,
      birthdayWindowDays: 0,
      incompatibleWithPoints: false,
    });

    const saved = await this.promoRepo.save(promo);

    showtime.maxSeatsPerOrder = CINE_FLASH_MAX_TICKETS;
    await this.showtimeRepo.save(showtime);

    await this.auditRepo.save(
      this.auditRepo.create({
        showtimeId: showtime.id,
        promotionId: saved.id,
        action: CineFlashAuditAction.ACTIVATED,
        reason: CineFlashAuditReason.OCCUPANCY_LOW,
        occupancyPercent: this.occupancyPercent(
          showtime.soldSeats,
          showtime.room.capacity,
        ),
        soldSeats: showtime.soldSeats,
        capacity: showtime.room.capacity,
        previousMaxSeatsPerOrder: previousMax,
      }),
    );

    this.logger.log(
      `Cine Flash ACTIVATED showtime=${showtime.id} promo=${saved.id} occ=${this.occupancyPercent(showtime.soldSeats, showtime.room.capacity)}%`,
    );

    return saved;
  }

  /**
   * Desactiva promo, restaura `maxSeatsPerOrder` y audita.
   */
  private async deactivatePromo(
    promo: Promotion,
    showtime: Showtime,
    reason: CineFlashAuditReason,
  ): Promise<void> {
    promo.isActive = false;
    promo.endsAt = new Date();
    await this.promoRepo.save(promo);

    const lastActivation = await this.auditRepo.findOne({
      where: {
        showtimeId: showtime.id,
        promotionId: promo.id,
        action: CineFlashAuditAction.ACTIVATED,
      },
      order: { createdAt: 'DESC' },
    });

    if (
      lastActivation?.previousMaxSeatsPerOrder != null &&
      showtime.maxSeatsPerOrder === CINE_FLASH_MAX_TICKETS
    ) {
      showtime.maxSeatsPerOrder = lastActivation.previousMaxSeatsPerOrder;
      await this.showtimeRepo.save(showtime);
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        showtimeId: showtime.id,
        promotionId: promo.id,
        action: CineFlashAuditAction.DEACTIVATED,
        reason,
        occupancyPercent: this.occupancyPercent(
          showtime.soldSeats,
          showtime.room.capacity,
        ),
        soldSeats: showtime.soldSeats,
        capacity: showtime.room.capacity,
        previousMaxSeatsPerOrder: null,
      }),
    );

    this.logger.log(
      `Cine Flash DEACTIVATED showtime=${showtime.id} reason=${reason}`,
    );
  }

  /**
   * Email marketing a socios de la ciudad + push stub (RN-086).
   */
  private async notifyActivation(
    showtime: Showtime,
    promo: Promotion,
  ): Promise<{ emails: number; push: number }> {
    const cityId = showtime.room.cinema.cityId;
    const profiles = await this.profileRepo.find({
      where: { cityId },
      select: ['userId'],
    });
    if (profiles.length === 0) {
      this.logger.log(
        `[PUSH STUB] Cine Flash showtime=${showtime.id} (sin perfiles en ciudad)`,
      );
      return { emails: 0, push: 1 };
    }

    const userIds = profiles.map((p) => p.userId);
    const prefs = await this.prefsRepo.find({
      where: { userId: In(userIds), emailMarketing: true },
    });
    const marketingIds = new Set(prefs.map((p) => p.userId));
    const users = await this.userRepo.find({
      where: { id: In([...marketingIds]) },
    });

    let emails = 0;
    for (const user of users) {
      if (!user.isActive || !user.isEmailVerified) continue;
      await this.emailService.sendCineFlash({
        userId: user.id,
        email: user.email,
        promotionId: promo.id,
        movieTitle: showtime.movie.title,
        startsAt: showtime.startsAt.toISOString(),
        cinemaName: showtime.room.cinema.name,
        roomName: showtime.room.name,
        discountPercent: CINE_FLASH_DISCOUNT_PERCENT,
        flashPrice: this.roundMoney(
          Number(showtime.price) * (1 - CINE_FLASH_DISCOUNT_PERCENT / 100),
        ),
        basePrice: Number(showtime.price),
        maxTickets: CINE_FLASH_MAX_TICKETS,
        functionId: showtime.id,
        movieId: showtime.movieId,
        cityId,
      });
      emails += 1;
    }

    this.logger.log(
      `[PUSH STUB] Cine Flash showtime=${showtime.id} recipients≈${users.length}`,
    );

    return { emails, push: 1 };
  }

  /**
   * @param sold - Sillas vendidas.
   * @param capacity - Capacidad sala.
   * @returns Porcentaje 0–100 con 2 decimales.
   */
  private occupancyPercent(sold: number, capacity: number): number {
    if (capacity <= 0) return 100;
    return Math.round((sold / capacity) * 10000) / 100;
  }

  /**
   * Redondeo monetario a 2 decimales (COP).
   */
  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
