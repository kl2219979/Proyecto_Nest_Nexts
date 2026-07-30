import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import {
  DataSource,
  In,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { Showtime } from '../movies/entities/showtime.entity';
import { LockSeatsDto } from './dto/lock-seats.dto';
import {
  ReleaseSeatsResult,
  ReservationResponse,
  SeatMapItem,
  SeatMapResponse,
  SeatSelectionSummary,
} from './dto/seat-map-response';
import { SeatLockAudit } from './entities/seat-lock-audit.entity';
import { SeatLock } from './entities/seat-lock.entity';
import { Seat } from './entities/seat.entity';
import {
  SeatLockAuditAction,
  SeatLockStatus,
  SeatRuntimeStatus,
  SeatType,
} from './enums/seat.enums';

/** TTL de bloqueo temporal (RN-039): 10 minutos. */
export const SEAT_LOCK_TTL_MS = 10 * 60 * 1000;

/**
 * Mapa de sillas, locks temporales y resumen de selección (HU-010).
 *
 * RN-039 lock 10 min · RN-040 liberación al expirar/abandonar ·
 * RN-041 no seleccionar ocupadas · RN-042 preferenciales ·
 * RN-043 anti sobreventa (unique + transacción).
 *
 * Separado de `ShowtimesService` (HU-009) por responsabilidad única.
 */
@Injectable()
export class SeatsService {
  /**
   * @param seatRepo - Layout físico por sala.
   * @param lockRepo - Ocupaciones LOCKED / SOLD.
   * @param auditRepo - Auditoría de bloqueos/liberaciones.
   * @param showtimeRepo - Funciones (precio, max, sala).
   * @param dataSource - Transacciones para concurrencia.
   */
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
    @InjectRepository(SeatLock)
    private readonly lockRepo: Repository<SeatLock>,
    @InjectRepository(SeatLockAudit)
    private readonly auditRepo: Repository<SeatLockAudit>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * `GET /functions/:id/seats`: plano con estados en tiempo real.
   *
   * Expira locks vencidos antes de armar el mapa (RN-040 / RN-043).
   *
   * @param functionId - UUID de la función.
   * @param viewerUserId - Si viene del JWT, marca SELECTED y arma mySelection.
   * @returns {Promise<SeatMapResponse>} Mapa + resumen opcional.
   */
  async getSeatMap(
    functionId: string,
    viewerUserId?: string,
  ): Promise<SeatMapResponse> {
    await this.expireOverdueLocks();
    const showtime = await this.loadSelectableShowtime(functionId);
    const seats = await this.seatRepo.find({
      where: { roomId: showtime.roomId },
      order: { gridRow: 'ASC', gridColumn: 'ASC' },
    });

    if (seats.length === 0) {
      throw new NotFoundException(
        `La sala de la función no tiene plano de sillas: ${functionId}`,
      );
    }

    const locks = await this.lockRepo.find({
      where: { showtimeId: functionId },
    });
    const lockBySeatId = new Map(locks.map((l) => [l.seatId, l]));

    const mapItems: SeatMapItem[] = seats.map((seat) =>
      this.toMapItem(seat, lockBySeatId.get(seat.id), viewerUserId),
    );

    const availableCount = mapItems.filter(
      (s) => s.status === SeatRuntimeStatus.AVAILABLE,
    ).length;

    const mySelection = viewerUserId
      ? this.buildSummaryFromLocks(
          showtime,
          locks.filter(
            (l) =>
              l.status === SeatLockStatus.LOCKED &&
              l.userId === viewerUserId,
          ),
          seats,
        )
      : null;

    return {
      functionId: showtime.id,
      movieId: showtime.movieId,
      room: {
        id: showtime.room.id,
        name: showtime.room.name,
        roomType: showtime.room.roomType,
      },
      cinema: {
        id: showtime.room.cinema.id,
        name: showtime.room.cinema.name,
      },
      startsAt: showtime.startsAt.toISOString(),
      unitPrice: Number(showtime.price),
      currency: 'COP',
      maxSeatsPerOrder: showtime.maxSeatsPerOrder,
      capacity: showtime.room.capacity,
      availableCount,
      seats: mapItems,
      mySelection,
    };
  }

  /**
   * `POST /functions/:id/seats`: bloquea sillas ~10 min (RN-039).
   *
   * Reemplaza locks previos del mismo usuario en esa función.
   * Unique `(showtimeId, seatId)` + transacción → anti doble-venta.
   *
   * @param functionId - UUID de la función.
   * @param userId - Usuario autenticado.
   * @param dto - Sillas + ack preferenciales.
   * @returns {Promise<ReservationResponse>} Reserva con resumen.
   */
  async lockSeats(
    functionId: string,
    userId: string,
    dto: LockSeatsDto,
  ): Promise<ReservationResponse> {
    await this.expireOverdueLocks();
    const showtime = await this.loadSelectableShowtime(functionId);

    if (dto.seatIds.length > showtime.maxSeatsPerOrder) {
      throw new BadRequestException(
        `Máximo ${showtime.maxSeatsPerOrder} sillas por función (maxSeatsPerOrder)`,
      );
    }

    const seats = await this.seatRepo.find({
      where: { id: In(dto.seatIds), roomId: showtime.roomId },
    });

    if (seats.length !== dto.seatIds.length) {
      throw new BadRequestException(
        'Una o más sillas no pertenecen a la sala de esta función',
      );
    }

    for (const seat of seats) {
      if (seat.seatType === SeatType.DISABLED) {
        throw new BadRequestException(
          `La silla ${seat.label} está inhabilitada (RN-041)`,
        );
      }
      if (
        seat.seatType === SeatType.PREFERENTIAL &&
        dto.acknowledgePreferential !== true
      ) {
        throw new BadRequestException(
          `La silla preferencial ${seat.label} requiere acknowledgePreferential=true (RN-042)`,
        );
      }
    }

    const reservationId = randomUUID();
    const expiresAt = new Date(Date.now() + SEAT_LOCK_TTL_MS);

    try {
      await this.dataSource.transaction(async (manager) => {
        const lockRepo = manager.getRepository(SeatLock);
        const auditRepo = manager.getRepository(SeatLockAudit);

        const previous = await lockRepo.find({
          where: {
            showtimeId: functionId,
            userId,
            status: SeatLockStatus.LOCKED,
          },
        });

        if (previous.length > 0) {
          await lockRepo.remove(previous);
          await auditRepo.save(
            previous.map((lock) =>
              auditRepo.create({
                showtimeId: functionId,
                seatId: lock.seatId,
                userId,
                reservationId: lock.reservationId,
                action: SeatLockAuditAction.RELEASE,
              }),
            ),
          );
        }

        const conflicting = await lockRepo.find({
          where: {
            showtimeId: functionId,
            seatId: In(dto.seatIds),
          },
        });

        if (conflicting.length > 0) {
          const labels = seats
            .filter((s) => conflicting.some((c) => c.seatId === s.id))
            .map((s) => s.label)
            .join(', ');
          throw new ConflictException(
            `Sillas no disponibles (RN-041): ${labels}`,
          );
        }

        const created = dto.seatIds.map((seatId) =>
          lockRepo.create({
            reservationId,
            showtimeId: functionId,
            seatId,
            userId,
            status: SeatLockStatus.LOCKED,
            expiresAt,
          }),
        );
        await lockRepo.save(created);

        await auditRepo.save(
          created.map((lock) =>
            auditRepo.create({
              showtimeId: functionId,
              seatId: lock.seatId,
              userId,
              reservationId,
              action: SeatLockAuditAction.LOCK,
            }),
          ),
        );
      });
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
      /**
       * Violación de unique `(showtimeId, seatId)` en carrera concurrente.
       */
      throw new ConflictException(
        'Una o más sillas acabaron de ser tomadas por otro usuario (RN-043)',
      );
    }

    return this.toReservationResponse(
      reservationId,
      showtime,
      seats,
      expiresAt,
    );
  }

  /**
   * `DELETE /reservations/release-seats`: libera locks del usuario (RN-040).
   *
   * @param userId - Usuario autenticado.
   * @param reservationId - Opcional; si falta, libera todos sus locks.
   * @returns {Promise<ReleaseSeatsResult>} Cantidad liberada.
   */
  async releaseSeats(
    userId: string,
    reservationId?: string,
  ): Promise<ReleaseSeatsResult> {
    await this.expireOverdueLocks();

    const where: {
      userId: string;
      status: SeatLockStatus;
      reservationId?: string;
    } = {
      userId,
      status: SeatLockStatus.LOCKED,
    };
    if (reservationId) {
      where.reservationId = reservationId;
    }

    const locks = await this.lockRepo.find({ where });
    if (locks.length === 0) {
      return { releasedCount: 0, reservationIds: [] };
    }

    const reservationIds = [
      ...new Set(locks.map((l) => l.reservationId)),
    ];

    await this.dataSource.transaction(async (manager) => {
      const lockRepo = manager.getRepository(SeatLock);
      const auditRepo = manager.getRepository(SeatLockAudit);
      await lockRepo.remove(locks);
      await auditRepo.save(
        locks.map((lock) =>
          auditRepo.create({
            showtimeId: lock.showtimeId,
            seatId: lock.seatId,
            userId,
            reservationId: lock.reservationId,
            action: SeatLockAuditAction.RELEASE,
          }),
        ),
      );
    });

    return { releasedCount: locks.length, reservationIds };
  }

  /**
   * Extiende `expiresAt` de los locks de una reserva (HU-011 / RN-045).
   *
   * Mientras el carrito esté activo, las sillas no deben liberarse
   * por el TTL original del lock de sillas.
   *
   * @param userId - Dueño de los locks.
   * @param reservationId - Grupo de sillas del carrito.
   * @param expiresAt - Nueva caducidad (alineada al carrito).
   * @returns {Promise<number>} Filas actualizadas.
   */
  async extendReservationExpiry(
    userId: string,
    reservationId: string,
    expiresAt: Date,
  ): Promise<number> {
    await this.expireOverdueLocks();
    const result = await this.lockRepo.update(
      {
        userId,
        reservationId,
        status: SeatLockStatus.LOCKED,
      },
      { expiresAt },
    );
    return result.affected ?? 0;
  }

  /**
   * Libera sillas concretas de una reserva (p. ej. al quitar ítems del carrito).
   *
   * @param userId - Dueño de los locks.
   * @param reservationId - Grupo de la reserva.
   * @param seatIds - Sillas a liberar.
   * @returns {Promise<number>} Cantidad liberada.
   */
  async releaseSeatsByIds(
    userId: string,
    reservationId: string,
    seatIds: string[],
  ): Promise<number> {
    if (seatIds.length === 0) {
      return 0;
    }
    await this.expireOverdueLocks();

    const locks = await this.lockRepo.find({
      where: {
        userId,
        reservationId,
        status: SeatLockStatus.LOCKED,
        seatId: In(seatIds),
      },
    });
    if (locks.length === 0) {
      return 0;
    }

    await this.dataSource.transaction(async (manager) => {
      const lockRepo = manager.getRepository(SeatLock);
      const auditRepo = manager.getRepository(SeatLockAudit);
      await lockRepo.remove(locks);
      await auditRepo.save(
        locks.map((lock) =>
          auditRepo.create({
            showtimeId: lock.showtimeId,
            seatId: lock.seatId,
            userId,
            reservationId: lock.reservationId,
            action: SeatLockAuditAction.RELEASE,
          }),
        ),
      );
    });

    return locks.length;
  }

  /**
   * `GET /reservations`: reserva(s) temporal(es) activas del usuario.
   *
   * @param userId - Usuario autenticado.
   * @returns {Promise<ReservationResponse[]>} Una entrada por reservationId.
   */
  async listMyReservations(userId: string): Promise<ReservationResponse[]> {
    await this.expireOverdueLocks();

    const locks = await this.lockRepo.find({
      where: { userId, status: SeatLockStatus.LOCKED },
      relations: {
        seat: true,
        showtime: { room: { cinema: true } },
      },
      order: { createdAt: 'ASC' },
    });

    if (locks.length === 0) {
      return [];
    }

    const byReservation = new Map<string, SeatLock[]>();
    for (const lock of locks) {
      const group = byReservation.get(lock.reservationId) ?? [];
      group.push(lock);
      byReservation.set(lock.reservationId, group);
    }

    const results: ReservationResponse[] = [];
    for (const [reservationId, group] of byReservation) {
      const showtime = group[0]!.showtime;
      const seats = group.map((l) => l.seat);
      const expiresAt = group[0]!.expiresAt ?? new Date();
      results.push(
        this.toReservationResponse(reservationId, showtime, seats, expiresAt),
      );
    }
    return results;
  }

  /**
   * Libera locks con `expiresAt <= now` y audita EXPIRE (RN-040).
   *
   * Se invoca de forma perezosa en cada operación de sillas
   * (sin job scheduler en esta HU).
   *
   * @returns {Promise<number>} Cantidad expirada.
   */
  async expireOverdueLocks(): Promise<number> {
    const overdue = await this.lockRepo.find({
      where: {
        status: SeatLockStatus.LOCKED,
        expiresAt: LessThanOrEqual(new Date()),
      },
    });

    if (overdue.length === 0) {
      return 0;
    }

    await this.dataSource.transaction(async (manager) => {
      const lockRepo = manager.getRepository(SeatLock);
      const auditRepo = manager.getRepository(SeatLockAudit);
      await lockRepo.remove(overdue);
      await auditRepo.save(
        overdue.map((lock) =>
          auditRepo.create({
            showtimeId: lock.showtimeId,
            seatId: lock.seatId,
            userId: lock.userId,
            reservationId: lock.reservationId,
            action: SeatLockAuditAction.EXPIRE,
          }),
        ),
      );
    });

    return overdue.length;
  }

  /**
   * Carga función futura/activa con sala y cine.
   *
   * @param functionId - UUID.
   * @throws {NotFoundException} Inexistente, inactiva o ya iniciada.
   */
  private async loadSelectableShowtime(
    functionId: string,
  ): Promise<Showtime> {
    const showtime = await this.showtimeRepo
      .createQueryBuilder('showtime')
      .innerJoinAndSelect('showtime.room', 'room')
      .innerJoinAndSelect('room.cinema', 'cinema')
      .where('showtime.id = :functionId', { functionId })
      .getOne();

    if (!showtime) {
      throw new NotFoundException(`Función no encontrada: ${functionId}`);
    }
    if (!showtime.isActive) {
      throw new NotFoundException(
        `La función no está activa (RN-036): ${functionId}`,
      );
    }
    if (showtime.startsAt.getTime() <= Date.now()) {
      throw new NotFoundException(
        `La función ya inició (RN-035): ${functionId}`,
      );
    }
    return showtime;
  }

  /**
   * Estado runtime de una silla cruzando layout + lock.
   */
  private toMapItem(
    seat: Seat,
    lock: SeatLock | undefined,
    viewerUserId?: string,
  ): SeatMapItem {
    let status: SeatRuntimeStatus;
    let lockExpiresAt: string | null = null;

    if (seat.seatType === SeatType.DISABLED) {
      status = SeatRuntimeStatus.DISABLED;
    } else if (lock?.status === SeatLockStatus.SOLD) {
      status = SeatRuntimeStatus.SOLD;
    } else if (lock?.status === SeatLockStatus.LOCKED) {
      lockExpiresAt = lock.expiresAt?.toISOString() ?? null;
      status =
        viewerUserId && lock.userId === viewerUserId
          ? SeatRuntimeStatus.SELECTED
          : SeatRuntimeStatus.LOCKED;
    } else {
      status = SeatRuntimeStatus.AVAILABLE;
    }

    return {
      id: seat.id,
      label: seat.label,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      gridRow: seat.gridRow,
      gridColumn: seat.gridColumn,
      seatType: seat.seatType,
      status,
      lockExpiresAt,
    };
  }

  /**
   * Arma resumen de precios para locks del usuario.
   */
  private buildSummaryFromLocks(
    showtime: Showtime,
    locks: SeatLock[],
    allSeats: Seat[],
  ): SeatSelectionSummary | null {
    if (locks.length === 0) {
      return null;
    }
    const seatById = new Map(allSeats.map((s) => [s.id, s]));
    const selected = locks
      .map((l) => seatById.get(l.seatId))
      .filter((s): s is Seat => Boolean(s));
    return this.buildSummary(showtime, selected);
  }

  /**
   * Calcula subtotal = unitPrice × cantidad (mismo precio de función).
   */
  private buildSummary(
    showtime: Showtime,
    seats: Seat[],
  ): SeatSelectionSummary {
    const unitPrice = Number(showtime.price);
    return {
      seatCount: seats.length,
      unitPrice,
      subtotal: unitPrice * seats.length,
      currency: 'COP',
      seats: seats.map((seat) => ({
        id: seat.id,
        label: seat.label,
        seatType: seat.seatType,
        unitPrice,
      })),
    };
  }

  /**
   * Mapea grupo de locks → respuesta de reserva.
   */
  private toReservationResponse(
    reservationId: string,
    showtime: Showtime,
    seats: Seat[],
    expiresAt: Date,
  ): ReservationResponse {
    return {
      reservationId,
      functionId: showtime.id,
      movieId: showtime.movieId,
      startsAt: showtime.startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      room: { id: showtime.room.id, name: showtime.room.name },
      cinema: {
        id: showtime.room.cinema.id,
        name: showtime.room.cinema.name,
      },
      summary: this.buildSummary(showtime, seats),
    };
  }
}
