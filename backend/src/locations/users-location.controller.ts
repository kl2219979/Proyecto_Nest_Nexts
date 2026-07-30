import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LocationsService, LocationPreference } from './locations.service';
import { SaveLocationDto } from './dto/save-location.dto';

/**
 * Preferencia de ubicación del visitante (HU-002).
 *
 * Ruta del backlog: `POST /users/location`.
 * Sin autenticación aún: valida y devuelve contexto para Local Storage.
 */
@ApiTags('Locations')
@Controller('users')
export class UsersLocationController {
  /**
   * @param locationsService - Servicio geográfico compartido.
   */
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Confirma la ciudad elegida y retorna cines activos de esa ciudad.
   *
   * @param dto - Body con `cityId`.
   * @returns {Promise<LocationPreference>} Contexto listo para guardar en el cliente.
   */
  @Post('location')
  @ApiOperation({
    summary: 'Guarda/valida la preferencia de ciudad del visitante',
    description:
      'Valida RN-006. El frontend debe persistir la respuesta en Local Storage (RN-008).',
  })
  @ApiOkResponse({ description: 'Contexto de ubicación y cines activos' })
  saveLocation(@Body() dto: SaveLocationDto): Promise<LocationPreference> {
    return this.locationsService.saveLocationPreference(dto);
  }
}
