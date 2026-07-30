import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BillboardQueryDto } from './dto/billboard-query.dto';
import { BillboardResponse } from './dto/billboard-response';
import { MovieDetailQueryDto } from './dto/movie-detail-query.dto';
import {
  MovieDetailResponse,
  MovieRecommendationsResponse,
} from './dto/movie-detail-response';
import { MovieFunctionsQueryDto } from './dto/movie-functions-query.dto';
import { MovieFunctionsResponse } from './dto/movie-functions-response';
import { UpcomingQueryDto } from './dto/upcoming-query.dto';
import { UpcomingMoviesResponse } from './dto/upcoming-response';
import { MoviesService } from './movies.service';
import { ShowtimesService } from './showtimes.service';

/**
 * Endpoints de cartelera (HU-003), detalle (HU-004), estrenos (HU-005)
 * y selección de función (HU-009).
 *
 * Rutas finales (con prefijo global):
 * - `GET /api/v1/movies`
 * - `GET /api/v1/movies/today`
 * - `GET /api/v1/movies/upcoming`
 * - `GET /api/v1/movies/:id`
 * - `GET /api/v1/movies/:id/recommendations`
 * - `GET /api/v1/movies/:id/functions`
 *
 * Orden de declaración: rutas estáticas (`today`, `upcoming`) y
 * subrutas (`recommendations`, `functions`) antes de `:id`.
 */
@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  /**
   * @param moviesService - Cartelera, detalle y estrenos.
   * @param showtimesService - Selección de función (HU-009).
   */
  constructor(
    private readonly moviesService: MoviesService,
    private readonly showtimesService: ShowtimesService,
  ) {}

  /**
   * Cartelera del día actual en la ciudad.
   *
   * @param query - Mismos filtros que la semanal; la fecha se fuerza a hoy.
   * @returns {Promise<BillboardResponse>} Películas con funciones de hoy.
   */
  @Get('today')
  @ApiOperation({
    summary: 'Cartelera de hoy por ciudad',
    description:
      'Misma forma que GET /movies, limitado a funciones del día actual.',
  })
  @ApiOkResponse({ description: 'Películas con funciones de hoy' })
  getTodayBillboard(
    @Query() query: BillboardQueryDto,
  ): Promise<BillboardResponse> {
    return this.moviesService.getTodayBillboard(query);
  }

  /**
   * Próximos estrenos (“Próximamente”) para una ciudad (HU-005).
   *
   * Declarada antes de `:id` para que Nest no trate `upcoming` como UUID.
   *
   * @param query - `cityId` (fechas pueden variar por ciudad, RN-018).
   * @returns {Promise<UpcomingMoviesResponse>} Listado ordenado por fecha.
   */
  @Get('upcoming')
  @ApiOperation({
    summary: 'Próximos estrenos por ciudad',
    description:
      'RN-017 solo status UPCOMING · RN-018 fecha por ciudad/complejo · orden por releaseDate.',
  })
  @ApiOkResponse({ description: 'Películas de próximos estrenos' })
  getUpcoming(
    @Query() query: UpcomingQueryDto,
  ): Promise<UpcomingMoviesResponse> {
    return this.moviesService.getUpcoming(query);
  }

  /**
   * Recomendaciones similares por género (HU-004).
   *
   * Declarada antes de `:id` para que Nest no trate `recommendations`
   * como un UUID de película.
   *
   * @param id - UUID de la película de referencia.
   * @param query - `cityId` de contexto.
   * @returns {Promise<MovieRecommendationsResponse>} Hasta 6 similares.
   */
  @Get(':id/recommendations')
  @ApiOperation({
    summary: 'Películas similares por género',
    description:
      'Prioriza títulos con función futura en la ciudad del visitante.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Lista de recomendaciones' })
  getRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MovieDetailQueryDto,
  ): Promise<MovieRecommendationsResponse> {
    return this.moviesService.getRecommendations(id, query);
  }

  /**
   * Funciones seleccionables de una película (HU-009).
   *
   * Declarada antes de `:id` para que Nest no trate `functions` como UUID.
   *
   * @param id - UUID de la película.
   * @param query - `cityId` + filtros (fecha, formato, complejo, …).
   * @returns {Promise<MovieFunctionsResponse>} Funciones + facetas.
   */
  @Get(':id/functions')
  @ApiOperation({
    summary: 'Funciones de una película para compra',
    description:
      'RN-035 solo futuras · RN-036 solo activas · filtros por fecha/complejo/formato/idioma/audio · facetas para UI.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Listado de funciones seleccionables' })
  getMovieFunctions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MovieFunctionsQueryDto,
  ): Promise<MovieFunctionsResponse> {
    return this.showtimesService.listFunctionsForMovie(id, query);
  }

  /**
   * Ficha completa de una película (HU-004 / HU-005 detalle).
   *
   * @param id - UUID de la película.
   * @param query - `cityId` para filtrar funciones futuras (RN-014).
   * @returns {Promise<MovieDetailResponse>} Detalle + horarios + precios.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de película por ciudad',
    description:
      'RN-014 solo funciones futuras · RN-015 isSoldOut · RN-016 trailerUrl · también sirve para próximos estrenos.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Ficha completa de la película' })
  getMovieDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MovieDetailQueryDto,
  ): Promise<MovieDetailResponse> {
    return this.moviesService.getMovieDetail(id, query);
  }

  /**
   * Cartelera de los próximos 7 días (RN-012) filtrada por ciudad.
   *
   * @param query - `cityId` obligatorio + filtros opcionales.
   * @returns {Promise<BillboardResponse>} Películas y funciones de la semana.
   */
  @Get()
  @ApiOperation({
    summary: 'Cartelera semanal (7 días) por ciudad',
    description:
      'RN-010 funciones activas · RN-011 filtro available · RN-012 ventana de 7 días.',
  })
  @ApiOkResponse({ description: 'Películas activas con horarios de la semana' })
  getWeeklyBillboard(
    @Query() query: BillboardQueryDto,
  ): Promise<BillboardResponse> {
    return this.moviesService.getWeeklyBillboard(query);
  }
}
