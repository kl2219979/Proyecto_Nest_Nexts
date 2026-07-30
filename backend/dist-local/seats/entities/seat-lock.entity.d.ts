import { User } from '../../auth/entities/user.entity';
import { Showtime } from '../../movies/entities/showtime.entity';
import { SeatLockStatus } from '../enums/seat.enums';
import { Seat } from './seat.entity';
export declare class SeatLock {
    id: string;
    reservationId: string;
    showtimeId: string;
    showtime: Showtime;
    seatId: string;
    seat: Seat;
    userId: string | null;
    user: User | null;
    status: SeatLockStatus;
    expiresAt: Date | null;
    createdAt: Date;
}
