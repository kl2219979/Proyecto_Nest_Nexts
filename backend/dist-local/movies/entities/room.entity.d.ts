import { Cinema } from '../../locations/entities/cinema.entity';
import { RoomType } from '../enums/movie.enums';
import { Showtime } from './showtime.entity';
export declare class Room {
    id: string;
    name: string;
    roomType: RoomType;
    capacity: number;
    cinemaId: string;
    cinema: Cinema;
    showtimes: Showtime[];
}
