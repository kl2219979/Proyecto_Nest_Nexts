import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CineflashService } from '../../cineflash/cineflash.service';
import { LocationsService } from '../../locations/locations.service';
import { BillboardQueryDto } from '../../movies/dto/billboard-query.dto';
import { MovieDetailQueryDto } from '../../movies/dto/movie-detail-query.dto';
import { MovieFunctionsQueryDto } from '../../movies/dto/movie-functions-query.dto';
import { UpcomingQueryDto } from '../../movies/dto/upcoming-query.dto';
import { MoviesService } from '../../movies/movies.service';
import { ShowtimesService } from '../../movies/showtimes.service';
import { PromotionsService } from '../../promotions/promotions.service';
import { RequireScopes } from '../decorators/api-client.decorators';
import { ApiClientScope } from '../enums/public-api.enums';
import { ApiClientAuthGuard } from '../guards/api-client-auth.guard';
import { ApiClientRateLimitGuard } from '../guards/api-client-rate-limit.guard';
import { ApiClientScopesGuard } from '../guards/api-client-scopes.guard';
import { PublicApiAuditInterceptor } from '../interceptors/public-api-audit.interceptor';
import { PublicCatalogService } from '../services/public-catalog.service';

/** Query opcional de ciudad para listar cines. */
class CinemasQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  cityId?: string;
}

/** Query para listar funciones vía facade (`movieId` + `cityId`). */
class PublicFunctionsQueryDto extends MovieFunctionsQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Película cuyas funciones se listan',
  })
  @IsUUID('4')
  movieId!: string;
}

/**
 * Facade de catálogo para apps externas (HU-029).
 *
 * Prefijo `/api/v1/public/*` · requiere API Key u OAuth client + scope `catalog:read`.
 * Delega a servicios de dominio existentes (no duplica reglas de negocio).
 */
@ApiTags('Public API · Catalog')
@ApiSecurity('api-key')
@ApiHeader({
  name: 'X-API-Key',
  required: false,
  description: 'API Key del consumidor (alternativa a OAuth Bearer)',
})
@Controller('public')
@UseGuards(ApiClientAuthGuard, ApiClientRateLimitGuard, ApiClientScopesGuard)
@UseInterceptors(PublicApiAuditInterceptor)
@RequireScopes(ApiClientScope.CATALOG_READ)
export class PublicCatalogController {
  constructor(
    private readonly locations: LocationsService,
    private readonly catalog: PublicCatalogService,
    private readonly movies: MoviesService,
    private readonly showtimes: ShowtimesService,
    private readonly promotions: PromotionsService,
    private readonly cineflash: CineflashService,
  ) {}

  @Get('countries')
  @ApiOperation({ summary: 'Países (API pública)' })
  @ApiOkResponse({ description: 'Listado de países' })
  @ApiUnauthorizedResponse({ description: 'Cliente no autenticado' })
  countries() {
    return this.locations.findCountries();
  }

  @Get('departments/:countryId')
  @ApiOperation({ summary: 'Departamentos de un país' })
  departments(@Param('countryId', ParseUUIDPipe) countryId: string) {
    return this.locations.findDepartmentsByCountry(countryId);
  }

  @Get('cities/:departmentId')
  @ApiOperation({ summary: 'Ciudades con cine activo (RN-006)' })
  cities(@Param('departmentId', ParseUUIDPipe) departmentId: string) {
    return this.locations.findCitiesByDepartment(departmentId);
  }

  @Get('cinemas')
  @ApiOperation({ summary: 'Complejos de cine activos' })
  cinemas(@Query() query: CinemasQueryDto) {
    return this.catalog.listCinemas(query.cityId);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Salas de un complejo' })
  rooms(@Query('cinemaId', ParseUUIDPipe) cinemaId: string) {
    return this.catalog.listRooms(cinemaId);
  }

  @Get('movies')
  @ApiOperation({ summary: 'Cartelera semanal' })
  moviesList(@Query() query: BillboardQueryDto) {
    return this.movies.getWeeklyBillboard(query);
  }

  @Get('movies/today')
  @ApiOperation({ summary: 'Cartelera de hoy' })
  moviesToday(@Query() query: BillboardQueryDto) {
    return this.movies.getTodayBillboard(query);
  }

  @Get('movies/upcoming')
  @ApiOperation({ summary: 'Próximos estrenos' })
  moviesUpcoming(@Query() query: UpcomingQueryDto) {
    return this.movies.getUpcoming(query);
  }

  @Get('movies/cineflash')
  @ApiOperation({ summary: 'Funciones con Cine Flash activo' })
  moviesCineflash(@Query('cityId') cityId?: string) {
    return this.cineflash.listActive(cityId);
  }

  @Get('movies/:id')
  @ApiOperation({ summary: 'Detalle de película' })
  movieDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MovieDetailQueryDto,
  ) {
    return this.movies.getMovieDetail(id, query);
  }

  @Get('movies/:id/functions')
  @ApiOperation({ summary: 'Funciones de una película' })
  movieFunctions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MovieFunctionsQueryDto,
  ) {
    return this.showtimes.listFunctionsForMovie(id, query);
  }

  @Get('functions')
  @ApiOperation({
    summary: 'Funciones disponibles (requiere movieId + cityId)',
    description: 'Espejo de GET /movies/:id/functions para el contrato HU-029.',
  })
  functions(@Query() query: PublicFunctionsQueryDto) {
    const { movieId, ...rest } = query;
    return this.showtimes.listFunctionsForMovie(movieId, rest);
  }

  @Get('functions/:id/prices')
  @ApiOperation({ summary: 'Precios de una función' })
  functionPrices(@Param('id', ParseUUIDPipe) id: string) {
    return this.showtimes.getFunctionPrices(id);
  }

  @Get('promotions')
  @ApiOperation({ summary: 'Promociones / cupones vigentes' })
  promotionsList() {
    return this.promotions.listActivePublic();
  }
}
