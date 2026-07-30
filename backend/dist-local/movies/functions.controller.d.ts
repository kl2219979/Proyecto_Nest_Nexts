import { FunctionPricesResponse } from './dto/movie-functions-response';
import { ShowtimesService } from './showtimes.service';
export declare class FunctionsController {
    private readonly showtimesService;
    constructor(showtimesService: ShowtimesService);
    getPrices(id: string): Promise<FunctionPricesResponse>;
}
