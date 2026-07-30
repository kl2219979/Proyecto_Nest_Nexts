import { AudioType, MovieFormat, RoomType } from '../enums/movie.enums';
export declare class MovieFunctionsQueryDto {
    cityId: string;
    date?: string;
    cinemaId?: string;
    format?: MovieFormat;
    language?: string;
    audioType?: AudioType;
    roomType?: RoomType;
    available?: boolean;
}
