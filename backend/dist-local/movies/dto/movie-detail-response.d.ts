import { AudioType, MovieFormat, MovieStatus, RoomType } from '../enums/movie.enums';
export type MovieCastMember = {
    name: string;
    role: string | null;
};
export type FormatPrice = {
    format: MovieFormat;
    price: number;
};
export type MovieDetailShowtime = {
    id: string;
    startsAt: string;
    format: MovieFormat;
    language: string;
    audioType: AudioType;
    price: number;
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
export type MovieDetailResponse = {
    id: string;
    title: string;
    posterUrl: string;
    bannerUrl: string | null;
    trailerUrl: string | null;
    synopsis: string | null;
    director: string;
    cast: MovieCastMember[];
    genres: string[];
    durationMinutes: number;
    classification: string;
    releaseDate: string | null;
    status: MovieStatus;
    rating: number;
    isPremiere: boolean;
    languages: string[];
    formats: MovieFormat[];
    pricesByFormat: FormatPrice[];
    cityId: string;
    showtimes: MovieDetailShowtime[];
};
export type MovieRecommendation = {
    id: string;
    title: string;
    posterUrl: string;
    genres: string[];
    classification: string;
    durationMinutes: number;
    rating: number;
    isPremiere: boolean;
};
export type MovieRecommendationsResponse = {
    movieId: string;
    cityId: string;
    recommendations: MovieRecommendation[];
};
