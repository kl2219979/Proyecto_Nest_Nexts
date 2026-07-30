import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FunctionPricesResponse } from './dto/movie-functions-response';
import { ShowtimesService } from './showtimes.service';

/**
 * Precios de una función concreta (HU-009).
 *
 * Prefijo global `/api/v1` → `GET /functions/:id/prices`.
 */
@ApiTags('Functions')
@Controller('functions')
export class FunctionsController {
  /**
   * @param showtimesService - Consulta de funciones y precios.
   */
  constructor(private readonly showtimesService: ShowtimesService) {}

  /**
   * Precio y disponibilidad de una función (RN-037 / RN-038).
   *
   * @param id - UUID de la función.
   * @returns {Promise<FunctionPricesResponse>} Precio base, factores y promos.
   */
  @Get(':id/prices')
  @ApiOperation({
    summary: 'Precio actualizado de una función',
    description:
      'RN-037 precio según formato/sala/horario · RN-038 promociones (vacío hasta HU-026) · RN-035/036 solo futuras activas.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Desglose de precio de la función' })
  @ApiNotFoundResponse({
    description: 'Función inexistente, inactiva o ya iniciada',
  })
  getPrices(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FunctionPricesResponse> {
    return this.showtimesService.getFunctionPrices(id);
  }
}
