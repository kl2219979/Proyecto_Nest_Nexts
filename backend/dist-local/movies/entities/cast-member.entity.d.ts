import { Movie } from './movie.entity';
export declare class CastMember {
    id: string;
    name: string;
    role: string | null;
    sortOrder: number;
    movieId: string;
    movie: Movie;
}
