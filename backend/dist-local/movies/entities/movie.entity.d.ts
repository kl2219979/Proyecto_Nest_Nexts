import { MovieStatus } from '../enums/movie.enums';
import { CastMember } from './cast-member.entity';
import { Genre } from './genre.entity';
import { MovieCityRelease } from './movie-city-release.entity';
import { Showtime } from './showtime.entity';
export declare class Movie {
    id: string;
    title: string;
    posterUrl: string;
    bannerUrl: string | null;
    trailerUrl: string | null;
    synopsis: string | null;
    releaseDate: string | null;
    classification: string;
    durationMinutes: number;
    director: string;
    rating: number;
    isPremiere: boolean;
    status: MovieStatus;
    isActive: boolean;
    genres: Genre[];
    castMembers: CastMember[];
    cityReleases: MovieCityRelease[];
    showtimes: Showtime[];
}
