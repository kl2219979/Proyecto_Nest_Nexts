import { BillboardQueryDto } from './dto/billboard-query.dto';
import { BillboardResponse } from './dto/billboard-response';
import { MovieDetailQueryDto } from './dto/movie-detail-query.dto';
import { MovieDetailResponse, MovieRecommendationsResponse } from './dto/movie-detail-response';
import { MovieFunctionsQueryDto } from './dto/movie-functions-query.dto';
import { MovieFunctionsResponse } from './dto/movie-functions-response';
import { UpcomingQueryDto } from './dto/upcoming-query.dto';
import { UpcomingMoviesResponse } from './dto/upcoming-response';
import { MoviesService } from './movies.service';
import { ShowtimesService } from './showtimes.service';
export declare class MoviesController {
    private readonly moviesService;
    private readonly showtimesService;
    constructor(moviesService: MoviesService, showtimesService: ShowtimesService);
    getTodayBillboard(query: BillboardQueryDto): Promise<BillboardResponse>;
    getUpcoming(query: UpcomingQueryDto): Promise<UpcomingMoviesResponse>;
    getRecommendations(id: string, query: MovieDetailQueryDto): Promise<MovieRecommendationsResponse>;
    getMovieFunctions(id: string, query: MovieFunctionsQueryDto): Promise<MovieFunctionsResponse>;
    getMovieDetail(id: string, query: MovieDetailQueryDto): Promise<MovieDetailResponse>;
    getWeeklyBillboard(query: BillboardQueryDto): Promise<BillboardResponse>;
}
