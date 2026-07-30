import { DataSource, In } from 'typeorm';
import { Room } from '../movies/entities/room.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { RoomType } from '../movies/enums/movie.enums';
import { SeatLock } from './entities/seat-lock.entity';
import { Seat } from './entities/seat.entity';
import { SeatLockStatus, SeatType } from './enums/seat.enums';
import { randomUUID } from 'crypto';

/**
 * Factores de forma del grid a partir de la capacidad.
 *
 * @param capacity - Butacas totales de la sala.
 * @returns Filas × columnas (aprox. capacidad).
 */
function gridForCapacity(capacity: number): { rows: number; cols: number } {
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

/**
 * Genera el layout de sillas de una sala.
 *
 * - Última fila, extremos: PREFERENTIAL (movilidad reducida).
 * - Una silla DISABLED cerca del pasillo central (demo).
 * - Salas VIP: tipo VIP en el resto.
 *
 * @param room - Sala persistida.
 * @returns Entidades Seat listas para guardar.
 */
function buildSeatsForRoom(room: Room): Seat[] {
  const { rows, cols } = gridForCapacity(room.capacity);
  const seats: Seat[] = [];
  const midCol = Math.floor(cols / 2);

  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r); // A, B, C…
    for (let c = 0; c < cols; c++) {
      const seatNumber = c + 1;
      const label = `${rowLabel}${seatNumber}`;
      let seatType = SeatType.STANDARD;

      if (room.roomType === RoomType.VIP) {
        seatType = SeatType.VIP;
      }

      /** Preferenciales en la última fila, extremos. */
      if (r === rows - 1 && (c === 0 || c === cols - 1)) {
        seatType = SeatType.PREFERENTIAL;
      }

      /** Una butaca inhabilitada (demo RN-041). */
      if (r === Math.floor(rows / 2) && c === midCol) {
        seatType = SeatType.DISABLED;
      }

      seats.push(
        Object.assign(new Seat(), {
          roomId: room.id,
          rowLabel,
          seatNumber,
          gridRow: r,
          gridColumn: c,
          label,
          seatType,
        }),
      );
    }
  }

  return seats;
}

/**
 * Siembra planos de sillas + ocupaciones SOLD alineadas a `soldSeats`.
 *
 * Idempotente: si ya hay sillas en alguna sala, no hace nada.
 *
 * @param dataSource - Conexión TypeORM.
 * @returns {Promise<void>}
 */
export async function seedSeats(dataSource: DataSource): Promise<void> {
  const seatRepo = dataSource.getRepository(Seat);
  const existing = await seatRepo.count();
  if (existing > 0) {
    return;
  }

  const roomRepo = dataSource.getRepository(Room);
  const showtimeRepo = dataSource.getRepository(Showtime);
  const lockRepo = dataSource.getRepository(SeatLock);

  const rooms = await roomRepo.find();
  if (rooms.length === 0) {
    return;
  }

  const allSeats: Seat[] = [];
  for (const room of rooms) {
    allSeats.push(...buildSeatsForRoom(room));
  }
  await seatRepo.save(allSeats);

  const seatsByRoom = new Map<string, Seat[]>();
  for (const seat of allSeats) {
    const list = seatsByRoom.get(seat.roomId) ?? [];
    list.push(seat);
    seatsByRoom.set(seat.roomId, list);
  }

  const showtimes = await showtimeRepo.find({
    where: { roomId: In(rooms.map((r) => r.id)) },
  });

  const soldLocks: SeatLock[] = [];
  for (const showtime of showtimes) {
    if (showtime.soldSeats <= 0) {
      continue;
    }
    const roomSeats = (seatsByRoom.get(showtime.roomId) ?? []).filter(
      (s) => s.seatType !== SeatType.DISABLED,
    );
    const toSell = roomSeats.slice(0, showtime.soldSeats);
    const reservationId = randomUUID();
    for (const seat of toSell) {
      soldLocks.push(
        lockRepo.create({
          reservationId,
          showtimeId: showtime.id,
          seatId: seat.id,
          userId: null,
          status: SeatLockStatus.SOLD,
          expiresAt: null,
        }),
      );
    }
  }

  if (soldLocks.length > 0) {
    await lockRepo.save(soldLocks);
  }
}
