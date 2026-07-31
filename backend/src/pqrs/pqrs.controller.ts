import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user.enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { CreatePqrsDto } from './dto/create-pqrs.dto';
import {
  PqrsCaseView,
  PqrsListResponse,
  PqrsSlaConfigView,
  PqrsSlaListResponse,
} from './dto/pqrs-response';
import { UpdatePqrsDto } from './dto/update-pqrs.dto';
import { UpdatePqrsSlaDto } from './dto/update-sla.dto';
import { PqrsStatus } from './enums/pqrs.enums';
import { PqrsService } from './pqrs.service';

/**
 * PQRS integrado (HU-028).
 *
 * Prefijo global `/api/v1`:
 * - `POST /pqrs` — alta (RN-110 / RN-111 / RN-112)
 * - `GET  /pqrs` — listado (propios o todos si STAFF+)
 * - `GET  /pqrs/:id` — seguimiento / detalle
 * - `PUT  /pqrs/:id` — comentarios, adjuntos, estado, asignación
 * - `GET/PUT /pqrs/sla` — SLA configurable (RN-111)
 */
@ApiTags('PQRS')
@Controller('pqrs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PqrsController {
  /**
   * @param pqrsService - Alta, seguimiento y gestión interna.
   */
  constructor(private readonly pqrsService: PqrsService) {}

  /**
   * Lista configuración SLA por categoría (RN-111).
   */
  @Get('sla')
  @ApiOperation({
    summary: 'Consultar SLA por categoría',
    description: 'Horas de plazo configurables (RN-111). Snapshot al crear el caso.',
  })
  @ApiOkResponse({ description: 'Configs SLA' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  listSla(): Promise<PqrsSlaListResponse> {
    return this.pqrsService.listSla();
  }

  /**
   * Actualiza horas SLA de una categoría (ADMIN+).
   *
   * @param dto - Categoría + horas.
   */
  @Put('sla')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar SLA de una categoría (ADMIN+)',
    description: 'No modifica plazos de casos ya abiertos (usan snapshot).',
  })
  @ApiOkResponse({ description: 'SLA actualizado' })
  @ApiForbiddenResponse({ description: 'Se requiere ADMIN+' })
  updateSla(@Body() dto: UpdatePqrsSlaDto): Promise<PqrsSlaConfigView> {
    return this.pqrsService.updateSla(dto);
  }

  /**
   * Lista casos del usuario (cliente) o todos (STAFF+).
   *
   * @param user - JWT.
   * @param status - Filtro opcional.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar PQRS',
    description:
      'Cliente: solo las propias. STAFF+: todas. Filtro opcional por estado.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PqrsStatus,
  })
  @ApiOkResponse({ description: 'Listado de casos' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: PqrsStatus,
  ): Promise<PqrsListResponse> {
    return this.pqrsService.list(user.userId, user.role, status);
  }

  /**
   * Detalle + comentarios + adjuntos + historial.
   *
   * @param user - JWT.
   * @param id - UUID del caso.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Consultar / hacer seguimiento de un caso',
    description: 'Incluye historial. Comentarios internos solo para STAFF+.',
  })
  @ApiOkResponse({ description: 'Detalle del caso' })
  @ApiNotFoundResponse({ description: 'No existe' })
  @ApiForbiddenResponse({ description: 'No es dueño ni staff' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PqrsCaseView> {
    return this.pqrsService.getDetail(user.userId, user.role, id);
  }

  /**
   * Registra una nueva PQRS.
   *
   * @param user - Cliente JWT.
   * @param dto - Categoría, asunto, descripción, adjuntos.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar PQRS',
    description:
      'RN-110 consecutivo automático · RN-111 SLA por categoría · RN-112 email de acuse.',
  })
  @ApiCreatedResponse({ description: 'Caso creado' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePqrsDto,
  ): Promise<PqrsCaseView> {
    return this.pqrsService.create(user.userId, user.email, dto);
  }

  /**
   * Actualiza un caso (comentario, adjuntos, estado, asignación).
   *
   * @param user - JWT.
   * @param id - UUID del caso.
   * @param dto - Cambios.
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar PQRS (seguimiento / gestión)',
    description:
      'Cliente: comentario y adjuntos. STAFF+: estado, asignación interna, comentarios internos. RN-112 notifica al cliente.',
  })
  @ApiOkResponse({ description: 'Caso actualizado' })
  @ApiNotFoundResponse({ description: 'No existe' })
  @ApiForbiddenResponse({ description: 'Sin permiso' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePqrsDto,
  ): Promise<PqrsCaseView> {
    return this.pqrsService.update(user, id, dto);
  }
}
