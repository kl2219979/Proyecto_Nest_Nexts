/**
 * Tests unitarios de `SeatsService` (HU-010).
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Showtime } from '../movies/entities/showtime.entity';
import {
  AudioType,
  MovieFormat,
  RoomType,
} from '../movies/enums/movie.enums';
import { SeatLockAudit } from './entities/seat-lock-audit.entity';
import { SeatLock } from './entities/seat-lock.entity';
import { Seat } from './entities/seat.entity';
import {
  SeatLockStatus,
  SeatRuntimeStatus,
  SeatType,
} from './enums/seat.enums';
import { SeatsService } from './seats.service';

describe('SeatsService', () => {
  let service: SeatsService;

  const seatRepo = {
    find: jest.fn(),
  };
  const lockRepo = {
    find: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const auditRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(),
  };
  const showtimeRepo = {
    createQueryBuilder: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  const futureStarts = new Date(Date.now() + 3 * 60 * 60 * 1000);

  const showtimeBase = {
    id: 'fn-1',
    movieId: 'movie-1',
    roomId: 'room-1',
    startsAt: futureStarts,
    isActive: true,
    price: 18000,
    maxSeatsPerOrder: 8,
    format: MovieFormat.TWO_D,
    language: 'ES',
    audioType: AudioType.DUBBED,
    room: {
      id: 'room-1',
      name: 'Sala 1',
      roomType: RoomType.STANDARD,
      capacity: 40,
      cinema: { id: 'cine-1', name: 'Laureles' },
    },
  };

  /**
   * Arma el módulo de testing.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    lockRepo.find.mockResolvedValue([]);
    dataSource.transaction.mockImplementation(
      async (fn: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === SeatLock) {
              return lockRepo;
            }
            if (entity === SeatLockAudit) {
              return auditRepo;
            }
            return {};
          },
        };
        return fn(manager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatsService,
        { provide: getRepositoryToken(Seat), useValue: seatRepo },
        { provide: getRepositoryToken(SeatLock), useValue: lockRepo },
        { provide: getRepositoryToken(SeatLockAudit), useValue: auditRepo },
        { provide: getRepositoryToken(Showtime), useValue: showtimeRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(SeatsService);
  });

  /**
   * Mock del QueryBuilder de showtimes.
   *
   * @param showtime - Resultado de getOne.
   */
  function mockShowtime(showtime: unknown | null) {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(showtime),
    };
    showtimeRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  /**
   * GET mapa: estados AVAILABLE / SOLD / DISABLED.
   *
   * @returns {Promise<void>}
   */
  it('getSeatMap returns runtime statuses', async () => {
    mockShowtime(showtimeBase);
    seatRepo.find.mockResolvedValue([
      {
        id: 's1',
        label: 'A1',
        rowLabel: 'A',
        seatNumber: 1,
        gridRow: 0,
        gridColumn: 0,
        seatType: SeatType.STANDARD,
      },
      {
        id: 's2',
        label: 'A2',
        rowLabel: 'A',
        seatNumber: 2,
        gridRow: 0,
        gridColumn: 1,
        seatType: SeatType.DISABLED,
      },
      {
        id: 's3',
        label: 'A3',
        rowLabel: 'A',
        seatNumber: 3,
        gridRow: 0,
        gridColumn: 2,
        seatType: SeatType.STANDARD,
      },
    ]);
    lockRepo.find
      .mockResolvedValueOnce([]) // expireOverdue
      .mockResolvedValueOnce([
        {
          seatId: 's3',
          status: SeatLockStatus.SOLD,
          userId: null,
          expiresAt: null,
        },
      ]);

    const map = await service.getSeatMap('fn-1');
    expect(map.seats.find((s) => s.id === 's1')?.status).toBe(
      SeatRuntimeStatus.AVAILABLE,
    );
    expect(map.seats.find((s) => s.id === 's2')?.status).toBe(
      SeatRuntimeStatus.DISABLED,
    );
    expect(map.seats.find((s) => s.id === 's3')?.status).toBe(
      SeatRuntimeStatus.SOLD,
    );
    expect(map.availableCount).toBe(1);
    expect(map.mySelection).toBeNull();
  });

  /**
   * JWT viewer: locks propios → SELECTED + mySelection.
   *
   * @returns {Promise<void>}
   */
  it('getSeatMap marks SELECTED for viewer locks', async () => {
    mockShowtime(showtimeBase);
    const expiresAt = new Date(Date.now() + 60_000);
    seatRepo.find.mockResolvedValue([
      {
        id: 's1',
        label: 'A1',
        rowLabel: 'A',
        seatNumber: 1,
        gridRow: 0,
        gridColumn: 0,
        seatType: SeatType.STANDARD,
      },
    ]);
    lockRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          seatId: 's1',
          status: SeatLockStatus.LOCKED,
          userId: 'user-1',
          expiresAt,
          reservationId: 'res-1',
        },
      ]);

    const map = await service.getSeatMap('fn-1', 'user-1');
    expect(map.seats[0]?.status).toBe(SeatRuntimeStatus.SELECTED);
    expect(map.mySelection?.seatCount).toBe(1);
    expect(map.mySelection?.subtotal).toBe(18000);
  });

  /**
   * POST lock crea reserva con TTL y resumen.
   *
   * @returns {Promise<void>}
   */
  it('lockSeats creates reservation with summary', async () => {
    mockShowtime(showtimeBase);
    seatRepo.find.mockResolvedValue([
      {
        id: 's1',
        label: 'A1',
        rowLabel: 'A',
        seatNumber: 1,
        gridRow: 0,
        gridColumn: 0,
        seatType: SeatType.STANDARD,
        roomId: 'room-1',
      },
    ]);
    lockRepo.find
      .mockResolvedValueOnce([]) // expire
      .mockResolvedValueOnce([]) // previous user locks
      .mockResolvedValueOnce([]); // conflicting

    const result = await service.lockSeats('fn-1', 'user-1', {
      seatIds: ['s1'],
    });

    expect(result.functionId).toBe('fn-1');
    expect(result.summary.seatCount).toBe(1);
    expect(result.summary.subtotal).toBe(18000);
    expect(result.reservationId).toBeDefined();
    expect(lockRepo.save).toHaveBeenCalled();
    expect(auditRepo.save).toHaveBeenCalled();
  });

  /**
   * RN-042: preferencial sin ack → 400.
   *
   * @returns {Promise<void>}
   */
  it('lockSeats rejects preferential without ack (RN-042)', async () => {
    mockShowtime(showtimeBase);
    seatRepo.find.mockResolvedValue([
      {
        id: 's1',
        label: 'D1',
        rowLabel: 'D',
        seatNumber: 1,
        gridRow: 3,
        gridColumn: 0,
        seatType: SeatType.PREFERENTIAL,
        roomId: 'room-1',
      },
    ]);
    lockRepo.find.mockResolvedValue([]);

    await expect(
      service.lockSeats('fn-1', 'user-1', { seatIds: ['s1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  /**
   * RN-041: silla ya ocupada → 409.
   *
   * @returns {Promise<void>}
   */
  it('lockSeats conflicts when seat already taken (RN-041)', async () => {
    mockShowtime(showtimeBase);
    seatRepo.find.mockResolvedValue([
      {
        id: 's1',
        label: 'A1',
        rowLabel: 'A',
        seatNumber: 1,
        gridRow: 0,
        gridColumn: 0,
        seatType: SeatType.STANDARD,
        roomId: 'room-1',
      },
    ]);
    lockRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { seatId: 's1', status: SeatLockStatus.LOCKED, userId: 'other' },
      ]);

    await expect(
      service.lockSeats('fn-1', 'user-1', { seatIds: ['s1'] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  /**
   * Función iniciada → 404 (RN-035).
   *
   * @returns {Promise<void>}
   */
  it('getSeatMap rejects started showtime (RN-035)', async () => {
    mockShowtime({
      ...showtimeBase,
      startsAt: new Date(Date.now() - 60_000),
    });
    lockRepo.find.mockResolvedValue([]);

    await expect(service.getSeatMap('fn-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  /**
   * DELETE release libera locks del usuario.
   *
   * @returns {Promise<void>}
   */
  it('releaseSeats removes user locks and audits', async () => {
    lockRepo.find
      .mockResolvedValueOnce([]) // expire
      .mockResolvedValueOnce([
        {
          id: 'lock-1',
          showtimeId: 'fn-1',
          seatId: 's1',
          userId: 'user-1',
          reservationId: 'res-1',
          status: SeatLockStatus.LOCKED,
        },
      ]);

    const result = await service.releaseSeats('user-1');
    expect(result.releasedCount).toBe(1);
    expect(result.reservationIds).toEqual(['res-1']);
    expect(lockRepo.remove).toHaveBeenCalled();
  });
});
