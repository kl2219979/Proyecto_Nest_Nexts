import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SnacksCatalogResponse } from './dto/snack-response';
import { SnacksQueryDto } from './dto/snacks-query.dto';
import { SnacksService } from './snacks.service';

/**
 * Catálogo digital de confitería (HU-012).
 *
 * Prefijo global `/api/v1`:
 * - `GET /snacks`
 */
@ApiTags('Snacks')
@Controller('snacks')
export class SnacksController {
  /**
   * @param snacksService - Catálogo e inventario.
   */
  constructor(private readonly snacksService: SnacksService) {}

  /**
   * Lista productos activos agrupados por categoría.
   *
   * @param query - Filtros `cinemaId` / `category`.
   * @returns {Promise<SnacksCatalogResponse>} Menú.
   */
  @Get()
  @ApiOperation({
    summary: 'Catálogo de confitería',
    description:
      'RN-049 available=false si stock=0. Promo de producto = stub RN-050. Pickup = cine de la función del carrito.',
  })
  @ApiOkResponse({ description: 'Catálogo agrupado por categoría' })
  list(@Query() query: SnacksQueryDto): Promise<SnacksCatalogResponse> {
    return this.snacksService.listCatalog(query);
  }
}
