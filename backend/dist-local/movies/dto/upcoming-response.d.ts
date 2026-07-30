import { MovieStatus } from '../enums/movie.enums';
export type UpcomingCinemaRelease = {
    cinemaId: string;
    cinemaName: string;
    releaseDate: string;
};
export type UpcomingMovieCard = {
    id: string;
    title: string;
    posterUrl: string;
    trailerUrl: string | null;
    synopsis: string | null;
    genres: string[];
    classification: string;
    durationMinutes: number | null;
    releaseDate: string;
    daysUntilRelease: number;
    status: MovieStatus;
    releasesByCinema: UpcomingCinemaRelease[];
};
export type UpcomingMoviesResponse = {
    cityId: string;
    movies: UpcomingMovieCard[];
};
