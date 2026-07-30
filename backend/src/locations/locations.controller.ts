import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { Country } from './entities/country.entity';
import { Department } from './entities/department.entity';
import { City } from './entities/city.entity';

/**
 * Endpoints de catálogo geográfico (HU-002).
 *
 * Rutas finales (con prefijo global):
 * - `GET /api/v1/countries`
 * - `GET /api/v1/departments/:countryId`
 * - `GET /api/v1/cities/:departmentId`
 */
@ApiTags('Locations')
@Controller()
export class LocationsController {
  /**
   * @param locationsService - Servicio con la lógica de consulta geográfica.
   */
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Primer paso del asistente: listar países.
   *
   * @returns {Promise<Country[]>} Países disponibles.
   */
  @Get('countries')
  @ApiOperation({ summary: 'Lista países' })
  @ApiOkResponse({ description: 'Países ordenados por nombre' })
  findCountries(): Promise<Country[]> {
    return this.locationsService.findCountries();
  }

  /**
   * Segundo paso: departamentos del país elegido.
   *
   * @param countryId - UUID del país (path param).
   * @returns {Promise<Department[]>} Departamentos del país.
   */
  @Get('departments/:countryId')
  @ApiOperation({ summary: 'Lista departamentos de un país' })
  @ApiParam({ name: 'countryId', format: 'uuid' })
  @ApiOkResponse({ description: 'Departamentos del país' })
  findDepartments(
    @Param('countryId', ParseUUIDPipe) countryId: string,
  ): Promise<Department[]> {
    return this.locationsService.findDepartmentsByCountry(countryId);
  }

  /**
   * Tercer paso: ciudades elegibles del departamento (RN-006).
   *
   * @param departmentId - UUID del departamento (path param).
   * @returns {Promise<City[]>} Ciudades activas con al menos un cine activo.
   */
  @Get('cities/:departmentId')
  @ApiOperation({
    summary: 'Lista ciudades con al menos un cine activo',
    description:
      'Aplica RN-006: omite ciudades inactivas y ciudades sin cines activos.',
  })
  @ApiParam({ name: 'departmentId', format: 'uuid' })
  @ApiOkResponse({ description: 'Ciudades filtradas del departamento' })
  findCities(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<City[]> {
    return this.locationsService.findCitiesByDepartment(departmentId);
  }
}
