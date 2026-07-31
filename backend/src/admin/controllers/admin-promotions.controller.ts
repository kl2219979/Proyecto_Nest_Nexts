import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user.enums';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
} from '../../promotions/dto/promotion.dto';
import { PromotionsService } from '../../promotions/promotions.service';
import { AdminPaginationQueryDto } from '../dto/admin-pagination.dto';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';

/**
 * CRUD administrativo de promociones y cupones (HU-026).
 *
 * Vive bajo `/api/admin/promotions` con JWT + RBAC ADMIN+ y auditoría.
 */
@ApiTags('Admin · Promotions')
@ApiBearerAuth()
@Controller('api/admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminPromotionsController {
  /**
   * @param promotions - Servicio de promociones.
   */
  constructor(private readonly promotions: PromotionsService) {}

  /**
   * Lista paginada de promociones.
   *
   * @param query - Página / búsqueda.
   * @returns Página de promociones.
   */
  @Get()
  @ApiOperation({ summary: 'Listar promociones (admin)' })
  list(@Query() query: AdminPaginationQueryDto) {
    return this.promotions.listAdmin(query);
  }

  /**
   * Detalle por id.
   *
   * @param id - UUID.
   * @returns Promoción.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de promoción (admin)' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.getById(id);
  }

  /**
   * Crea promoción / cupón.
   *
   * @param dto - Configuración (vigencia, scopes, reglas).
   * @returns Promoción creada.
   */
  @Post()
  @ApiOperation({
    summary: 'Crear promoción / cupón',
    description:
      'RN-105 acumulables · RN-106 vigencia · RN-107 max por usuario · scopes ciudad/cine/sala/película/género/formato',
  })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotions.create(dto);
  }

  /**
   * Actualiza promoción.
   *
   * @param id - UUID.
   * @param dto - Campos parciales.
   * @returns Promoción actualizada.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Editar promoción / cupón' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotions.update(id, dto);
  }

  /**
   * Desactiva promoción (`isActive = false`).
   *
   * @param id - UUID.
   * @returns Promoción desactivada.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar promoción' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.remove(id);
  }
}
