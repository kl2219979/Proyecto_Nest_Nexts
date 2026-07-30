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
exports.SeatsService = exports.SEAT_LOCK_TTL_MS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const showtime_entity_1 = require("../movies/entities/showtime.entity");
const seat_lock_audit_entity_1 = require("./entities/seat-lock-audit.entity");
const seat_lock_entity_1 = require("./entities/seat-lock.entity");
const seat_entity_1 = require("./entities/seat.entity");
const seat_enums_1 = require("./enums/seat.enums");
exports.SEAT_LOCK_TTL_MS = 10 * 60 * 1000;
let SeatsService = class SeatsService {
    seatRepo;
    lockRepo;
    auditRepo;
    showtimeRepo;
    dataSource;
    constructor(seatRepo, lockRepo, auditRepo, showtimeRepo, dataSource) {
        this.seatRepo = seatRepo;
        this.lockRepo = lockRepo;
        this.auditRepo = auditRepo;
        this.showtimeRepo = showtimeRepo;
        this.dataSource = dataSource;
    }
    async getSeatMap(functionId, viewerUserId) {
        await this.expireOverdueLocks();
        const showtime = await this.loadSelectableShowtime(functionId);
        const seats = await this.seatRepo.find({
            where: { roomId: showtime.roomId },
            order: { gridRow: 'ASC', gridColumn: 'ASC' },
        });
        if (seats.length === 0) {
            throw new common_1.NotFoundException(`La sala de la función no tiene plano de sillas: ${functionId}`);
        }
        const locks = await this.lockRepo.find({
            where: { showtimeId: functionId },
        });
        const lockBySeatId = new Map(locks.map((l) => [l.seatId, l]));
        const mapItems = seats.map((seat) => this.toMapItem(seat, lockBySeatId.get(seat.id), viewerUserId));
        const availableCount = mapItems.filter((s) => s.status === seat_enums_1.SeatRuntimeStatus.AVAILABLE).length;
        const mySelection = viewerUserId
            ? this.buildSummaryFromLocks(showtime, locks.filter((l) => l.status === seat_enums_1.SeatLockStatus.LOCKED &&
                l.userId === viewerUserId), seats)
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
    async lockSeats(functionId, userId, dto) {
        await this.expireOverdueLocks();
        const showtime = await this.loadSelectableShowtime(functionId);
        if (dto.seatIds.length > showtime.maxSeatsPerOrder) {
            throw new common_1.BadRequestException(`Máximo ${showtime.maxSeatsPerOrder} sillas por función (maxSeatsPerOrder)`);
        }
        const seats = await this.seatRepo.find({
            where: { id: (0, typeorm_2.In)(dto.seatIds), roomId: showtime.roomId },
        });
        if (seats.length !== dto.seatIds.length) {
            throw new common_1.BadRequestException('Una o más sillas no pertenecen a la sala de esta función');
        }
        for (const seat of seats) {
            if (seat.seatType === seat_enums_1.SeatType.DISABLED) {
                throw new common_1.BadRequestException(`La silla ${seat.label} está inhabilitada (RN-041)`);
            }
            if (seat.seatType === seat_enums_1.SeatType.PREFERENTIAL &&
                dto.acknowledgePreferential !== true) {
                throw new common_1.BadRequestException(`La silla preferencial ${seat.label} requiere acknowledgePreferential=true (RN-042)`);
            }
        }
        const reservationId = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + exports.SEAT_LOCK_TTL_MS);
        try {
            await this.dataSource.transaction(async (manager) => {
                const lockRepo = manager.getRepository(seat_lock_entity_1.SeatLock);
                const auditRepo = manager.getRepository(seat_lock_audit_entity_1.SeatLockAudit);
                const previous = await lockRepo.find({
                    where: {
                        showtimeId: functionId,
                        userId,
                        status: seat_enums_1.SeatLockStatus.LOCKED,
                    },
                });
                if (previous.length > 0) {
                    await lockRepo.remove(previous);
                    await auditRepo.save(previous.map((lock) => auditRepo.create({
                        showtimeId: functionId,
                        seatId: lock.seatId,
                        userId,
                        reservationId: lock.reservationId,
                        action: seat_enums_1.SeatLockAuditAction.RELEASE,
                    })));
                }
                const conflicting = await lockRepo.find({
                    where: {
                        showtimeId: functionId,
                        seatId: (0, typeorm_2.In)(dto.seatIds),
                    },
                });
                if (conflicting.length > 0) {
                    const labels = seats
                        .filter((s) => conflicting.some((c) => c.seatId === s.id))
                        .map((s) => s.label)
                        .join(', ');
                    throw new common_1.ConflictException(`Sillas no disponibles (RN-041): ${labels}`);
                }
                const created = dto.seatIds.map((seatId) => lockRepo.create({
                    reservationId,
                    showtimeId: functionId,
                    seatId,
                    userId,
                    status: seat_enums_1.SeatLockStatus.LOCKED,
                    expiresAt,
                }));
                await lockRepo.save(created);
                await auditRepo.save(created.map((lock) => auditRepo.create({
                    showtimeId: functionId,
                    seatId: lock.seatId,
                    userId,
                    reservationId,
                    action: seat_enums_1.SeatLockAuditAction.LOCK,
                })));
            });
        }
        catch (err) {
            if (err instanceof common_1.ConflictException || err instanceof common_1.BadRequestException) {
                throw err;
            }
            throw new common_1.ConflictException('Una o más sillas acabaron de ser tomadas por otro usuario (RN-043)');
        }
        return this.toReservationResponse(reservationId, showtime, seats, expiresAt);
    }
    async releaseSeats(userId, reservationId) {
        await this.expireOverdueLocks();
        const where = {
            userId,
            status: seat_enums_1.SeatLockStatus.LOCKED,
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
            const lockRepo = manager.getRepository(seat_lock_entity_1.SeatLock);
            const auditRepo = manager.getRepository(seat_lock_audit_entity_1.SeatLockAudit);
            await lockRepo.remove(locks);
            await auditRepo.save(locks.map((lock) => auditRepo.create({
                showtimeId: lock.showtimeId,
                seatId: lock.seatId,
                userId,
                reservationId: lock.reservationId,
                action: seat_enums_1.SeatLockAuditAction.RELEASE,
            })));
        });
        return { releasedCount: locks.length, reservationIds };
    }
    async listMyReservations(userId) {
        await this.expireOverdueLocks();
        const locks = await this.lockRepo.find({
            where: { userId, status: seat_enums_1.SeatLockStatus.LOCKED },
            relations: {
                seat: true,
                showtime: { room: { cinema: true } },
            },
            order: { createdAt: 'ASC' },
        });
        if (locks.length === 0) {
            return [];
        }
        const byReservation = new Map();
        for (const lock of locks) {
            const group = byReservation.get(lock.reservationId) ?? [];
            group.push(lock);
            byReservation.set(lock.reservationId, group);
        }
        const results = [];
        for (const [reservationId, group] of byReservation) {
            const showtime = group[0].showtime;
            const seats = group.map((l) => l.seat);
            const expiresAt = group[0].expiresAt ?? new Date();
            results.push(this.toReservationResponse(reservationId, showtime, seats, expiresAt));
        }
        return results;
    }
    async expireOverdueLocks() {
        const overdue = await this.lockRepo.find({
            where: {
                status: seat_enums_1.SeatLockStatus.LOCKED,
                expiresAt: (0, typeorm_2.LessThanOrEqual)(new Date()),
            },
        });
        if (overdue.length === 0) {
            return 0;
        }
        await this.dataSource.transaction(async (manager) => {
            const lockRepo = manager.getRepository(seat_lock_entity_1.SeatLock);
            const auditRepo = manager.getRepository(seat_lock_audit_entity_1.SeatLockAudit);
            await lockRepo.remove(overdue);
            await auditRepo.save(overdue.map((lock) => auditRepo.create({
                showtimeId: lock.showtimeId,
                seatId: lock.seatId,
                userId: lock.userId,
                reservationId: lock.reservationId,
                action: seat_enums_1.SeatLockAuditAction.EXPIRE,
            })));
        });
        return overdue.length;
    }
    async loadSelectableShowtime(functionId) {
        const showtime = await this.showtimeRepo
            .createQueryBuilder('showtime')
            .innerJoinAndSelect('showtime.room', 'room')
            .innerJoinAndSelect('room.cinema', 'cinema')
            .where('showtime.id = :functionId', { functionId })
            .getOne();
        if (!showtime) {
            throw new common_1.NotFoundException(`Función no encontrada: ${functionId}`);
        }
        if (!showtime.isActive) {
            throw new common_1.NotFoundException(`La función no está activa (RN-036): ${functionId}`);
        }
        if (showtime.startsAt.getTime() <= Date.now()) {
            throw new common_1.NotFoundException(`La función ya inició (RN-035): ${functionId}`);
        }
        return showtime;
    }
    toMapItem(seat, lock, viewerUserId) {
        let status;
        let lockExpiresAt = null;
        if (seat.seatType === seat_enums_1.SeatType.DISABLED) {
            status = seat_enums_1.SeatRuntimeStatus.DISABLED;
        }
        else if (lock?.status === seat_enums_1.SeatLockStatus.SOLD) {
            status = seat_enums_1.SeatRuntimeStatus.SOLD;
        }
        else if (lock?.status === seat_enums_1.SeatLockStatus.LOCKED) {
            lockExpiresAt = lock.expiresAt?.toISOString() ?? null;
            status =
                viewerUserId && lock.userId === viewerUserId
                    ? seat_enums_1.SeatRuntimeStatus.SELECTED
                    : seat_enums_1.SeatRuntimeStatus.LOCKED;
        }
        else {
            status = seat_enums_1.SeatRuntimeStatus.AVAILABLE;
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
    buildSummaryFromLocks(showtime, locks, allSeats) {
        if (locks.length === 0) {
            return null;
        }
        const seatById = new Map(allSeats.map((s) => [s.id, s]));
        const selected = locks
            .map((l) => seatById.get(l.seatId))
            .filter((s) => Boolean(s));
        return this.buildSummary(showtime, selected);
    }
    buildSummary(showtime, seats) {
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
    toReservationResponse(reservationId, showtime, seats, expiresAt) {
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
};
exports.SeatsService = SeatsService;
exports.SeatsService = SeatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(seat_entity_1.Seat)),
    __param(1, (0, typeorm_1.InjectRepository)(seat_lock_entity_1.SeatLock)),
    __param(2, (0, typeorm_1.InjectRepository)(seat_lock_audit_entity_1.SeatLockAudit)),
    __param(3, (0, typeorm_1.InjectRepository)(showtime_entity_1.Showtime)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], SeatsService);
//# sourceMappingURL=seats.service.js.map