import { SeatLockAuditAction } from '../enums/seat.enums';
export declare class SeatLockAudit {
    id: string;
    showtimeId: string;
    seatId: string;
    userId: string | null;
    reservationId: string | null;
    action: SeatLockAuditAction;
    createdAt: Date;
}
