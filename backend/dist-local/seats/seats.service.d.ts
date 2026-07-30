import { DataSource, Repository } from 'typeorm';
import { Showtime } from '../movies/entities/showtime.entity';
import { LockSeatsDto } from './dto/lock-seats.dto';
import { ReleaseSeatsResult, ReservationResponse, SeatMapResponse } from './dto/seat-map-response';
import { SeatLockAudit } from './entities/seat-lock-audit.entity';
import { SeatLock } from './entities/seat-lock.entity';
import { Seat } from './entities/seat.entity';
export declare const SEAT_LOCK_TTL_MS: number;
export declare class SeatsService {
    private readonly seatRepo;
    private readonly lockRepo;
    private readonly auditRepo;
    private readonly showtimeRepo;
    private readonly dataSource;
    constructor(seatRepo: Repository<Seat>, lockRepo: Repository<SeatLock>, auditRepo: Repository<SeatLockAudit>, showtimeRepo: Repository<Showtime>, dataSource: DataSource);
    getSeatMap(functionId: string, viewerUserId?: string): Promise<SeatMapResponse>;
    lockSeats(functionId: string, userId: string, dto: LockSeatsDto): Promise<ReservationResponse>;
    releaseSeats(userId: string, reservationId?: string): Promise<ReleaseSeatsResult>;
    listMyReservations(userId: string): Promise<ReservationResponse[]>;
    expireOverdueLocks(): Promise<number>;
    private loadSelectableShowtime;
    private toMapItem;
    private buildSummaryFromLocks;
    private buildSummary;
    private toReservationResponse;
}
