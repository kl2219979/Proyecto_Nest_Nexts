import { AudioType, MovieFormat, RoomType } from '../enums/movie.enums';
export declare class BillboardQueryDto {
    cityId: string;
    date?: string;
    genre?: string;
    classification?: string;
    language?: string;
    roomType?: RoomType;
    format?: MovieFormat;
    cinemaId?: string;
    available?: boolean;
    audioType?: AudioType;
}
