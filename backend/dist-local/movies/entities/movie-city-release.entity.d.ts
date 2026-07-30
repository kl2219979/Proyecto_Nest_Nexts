import { Cinema } from '../../locations/entities/cinema.entity';
import { City } from '../../locations/entities/city.entity';
import { Movie } from './movie.entity';
export declare class MovieCityRelease {
    id: string;
    movieId: string;
    movie: Movie;
    cityId: string;
    city: City;
    cinemaId: string | null;
    cinema: Cinema | null;
    releaseDate: string;
}
