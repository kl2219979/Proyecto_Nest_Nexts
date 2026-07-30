import { Repository } from 'typeorm';
import { City } from '../locations/entities/city.entity';
import { MovieFunctionsQueryDto } from './dto/movie-functions-query.dto';
import { FunctionPricesResponse, MovieFunctionsResponse } from './dto/movie-functions-response';
import { Movie } from './entities/movie.entity';
import { Showtime } from './entities/showtime.entity';
export declare class ShowtimesService {
    private readonly showtimeRepo;
    private readonly movieRepo;
    private readonly cityRepo;
    constructor(showtimeRepo: Repository<Showtime>, movieRepo: Repository<Movie>, cityRepo: Repository<City>);
    listFunctionsForMovie(movieId: string, query: MovieFunctionsQueryDto): Promise<MovieFunctionsResponse>;
    getFunctionPrices(functionId: string): Promise<FunctionPricesResponse>;
    private querySelectableShowtimes;
    private toFunctionItem;
    private buildFacets;
    private assertCityExists;
    private assertMovieExists;
    private formatLocalDate;
    private parseLocalDate;
    private resolveDayBounds;
}
