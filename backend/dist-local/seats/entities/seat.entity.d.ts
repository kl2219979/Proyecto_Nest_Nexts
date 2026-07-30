import { Room } from '../../movies/entities/room.entity';
import { SeatType } from '../enums/seat.enums';
export declare class Seat {
    id: string;
    rowLabel: string;
    seatNumber: number;
    gridColumn: number;
    gridRow: number;
    label: string;
    seatType: SeatType;
    roomId: string;
    room: Room;
}
