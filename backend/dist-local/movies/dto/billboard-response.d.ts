import { AudioType, MovieFormat, RoomType } from '../enums/movie.enums';
export type BillboardShowtime = {
    id: string;
    startsAt: string;
    format: MovieFormat;
    language: string;
    audioType: AudioType;
    isSoldOut: boolean;
    cinema: {
        id: string;
        name: string;
    };
    room: {
        id: string;
        name: string;
        roomType: RoomType;
    };
};
export type BillboardMovie = {
    id: string;
    title: string;
    posterUrl: string;
    genres: string[];
    classification: string;
    durationMinutes: number;
    director: string;
    rating: number;
    isPremiere: boolean;
    formats: MovieFormat[];
    languages: string[];
    audioTypes: AudioType[];
    showtimes: BillboardShowtime[];
};
export type BillboardResponse = {
    cityId: string;
    from: string;
    to: string;
    movies: BillboardMovie[];
};
