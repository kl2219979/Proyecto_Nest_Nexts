import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user.enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { PromotionsService } from './promotions.service';

/**
 * Endpoints públicos / REST de promociones (HU-026).
 *
 * - `GET /promotions` — catálogo activo vigente (público).
 * - `POST|PUT|DELETE /promotions` — CRUD con JWT ADMIN+ (backlog).
 *
 * El panel también expone el mismo CRUD en `/api/admin/promotions`
 * con auditoría (HU-020).
 */
@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  /**
   * @param promotions - Servicio de promociones.
   */
  constructor(private readonly promotions: PromotionsService) {}

  /**
   * Lista promociones activas y dentro de vigencia.
   *
   * @returns Catálogo público.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar promociones activas',
    description: 'Solo vigentes (RN-106) e `isActive=true`.',
  })
  listActive() {
    return this.promotions.listActivePublic();
  }

  /**
   * Crea promoción (ADMIN+). Preferible `/api/admin/promotions` con auditoría.
   *
   * @param dto - Configuración.
   * @returns Promoción creada.
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear promoción (ADMIN)' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotions.create(dto);
  }

  /**
   * Actualiza promoción (ADMIN+).
   *
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Promoción actualizada.
   */
  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Editar promoción (ADMIN)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotions.update(id, dto);
  }

  /**
   * Desactiva promoción (ADMIN+).
   *
   * @param id - UUID.
   * @returns Promoción desactivada.
   */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar promoción (ADMIN)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.remove(id);
  }
}
