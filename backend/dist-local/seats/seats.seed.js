"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSeats = seedSeats;
const typeorm_1 = require("typeorm");
const room_entity_1 = require("../movies/entities/room.entity");
const showtime_entity_1 = require("../movies/entities/showtime.entity");
const movie_enums_1 = require("../movies/enums/movie.enums");
const seat_lock_entity_1 = require("./entities/seat-lock.entity");
const seat_entity_1 = require("./entities/seat.entity");
const seat_enums_1 = require("./enums/seat.enums");
const crypto_1 = require("crypto");
function gridForCapacity(capacity) {
    if (capacity <= 40) {
        return { rows: 4, cols: 10 };
    }
    if (capacity <= 120) {
        return { rows: 10, cols: 12 };
    }
    if (capacity <= 150) {
        return { rows: 10, cols: 15 };
    }
    return { rows: 10, cols: 20 };
}
function buildSeatsForRoom(room) {
    const { rows, cols } = gridForCapacity(room.capacity);
    const seats = [];
    const midCol = Math.floor(cols / 2);
    for (let r = 0; r < rows; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let c = 0; c < cols; c++) {
            const seatNumber = c + 1;
            const label = `${rowLabel}${seatNumber}`;
            let seatType = seat_enums_1.SeatType.STANDARD;
            if (room.roomType === movie_enums_1.RoomType.VIP) {
                seatType = seat_enums_1.SeatType.VIP;
            }
            if (r === rows - 1 && (c === 0 || c === cols - 1)) {
                seatType = seat_enums_1.SeatType.PREFERENTIAL;
            }
            if (r === Math.floor(rows / 2) && c === midCol) {
                seatType = seat_enums_1.SeatType.DISABLED;
            }
            seats.push(Object.assign(new seat_entity_1.Seat(), {
                roomId: room.id,
                rowLabel,
                seatNumber,
                gridRow: r,
                gridColumn: c,
                label,
                seatType,
            }));
        }
    }
    return seats;
}
async function seedSeats(dataSource) {
    const seatRepo = dataSource.getRepository(seat_entity_1.Seat);
    const existing = await seatRepo.count();
    if (existing > 0) {
        return;
    }
    const roomRepo = dataSource.getRepository(room_entity_1.Room);
    const showtimeRepo = dataSource.getRepository(showtime_entity_1.Showtime);
    const lockRepo = dataSource.getRepository(seat_lock_entity_1.SeatLock);
    const rooms = await roomRepo.find();
    if (rooms.length === 0) {
        return;
    }
    const allSeats = [];
    for (const room of rooms) {
        allSeats.push(...buildSeatsForRoom(room));
    }
    await seatRepo.save(allSeats);
    const seatsByRoom = new Map();
    for (const seat of allSeats) {
        const list = seatsByRoom.get(seat.roomId) ?? [];
        list.push(seat);
        seatsByRoom.set(seat.roomId, list);
    }
    const showtimes = await showtimeRepo.find({
        where: { roomId: (0, typeorm_1.In)(rooms.map((r) => r.id)) },
    });
    const soldLocks = [];
    for (const showtime of showtimes) {
        if (showtime.soldSeats <= 0) {
            continue;
        }
        const roomSeats = (seatsByRoom.get(showtime.roomId) ?? []).filter((s) => s.seatType !== seat_enums_1.SeatType.DISABLED);
        const toSell = roomSeats.slice(0, showtime.soldSeats);
        const reservationId = (0, crypto_1.randomUUID)();
        for (const seat of toSell) {
            soldLocks.push(lockRepo.create({
                reservationId,
                showtimeId: showtime.id,
                seatId: seat.id,
                userId: null,
                status: seat_enums_1.SeatLockStatus.SOLD,
                expiresAt: null,
            }));
        }
    }
    if (soldLocks.length > 0) {
        await lockRepo.save(soldLocks);
    }
}
//# sourceMappingURL=seats.seed.js.map