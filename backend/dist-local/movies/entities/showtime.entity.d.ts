import { AudioType, MovieFormat } from '../enums/movie.enums';
import { Movie } from './movie.entity';
import { Room } from './room.entity';
export declare class Showtime {
    id: string;
    startsAt: Date;
    format: MovieFormat;
    language: string;
    audioType: AudioType;
    soldSeats: number;
    price: number;
    maxSeatsPerOrder: number;
    isActive: boolean;
    movieId: string;
    movie: Movie;
    roomId: string;
    room: Room;
}
