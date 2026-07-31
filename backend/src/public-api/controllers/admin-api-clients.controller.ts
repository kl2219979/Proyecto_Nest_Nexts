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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user.enums';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { AdminAuditInterceptor } from '../../admin/interceptors/admin-audit.interceptor';
import { CreateApiClientDto, UpdateApiClientDto } from '../dto/api-client.dto';
import { ApiClientsService } from '../services/api-clients.service';
import { PublicApiAuditService } from '../services/public-api-audit.service';

/**
 * Administración de clientes de la API pública (HU-029 / RN-114).
 *
 * Rutas bajo `/api/admin/api-clients` (sin prefijo v1).
 */
@ApiTags('Admin · API Clients')
@ApiBearerAuth()
@Controller('api/admin/api-clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminApiClientsController {
  constructor(
    private readonly clients: ApiClientsService,
    private readonly publicAudit: PublicApiAuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes API externos' })
  @ApiOkResponse({ description: 'Clientes sin secretos' })
  list() {
    return this.clients.list();
  }

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Auditoría de la API pública (RN-117)',
    description: 'Últimos eventos de consumidores externos.',
  })
  listAudit(
    @Query('limit') limit?: string,
    @Query('apiClientId') apiClientId?: string,
  ) {
    const take = limit ? Number(limit) : 100;
    return this.publicAudit.list(
      Number.isFinite(take) ? take : 100,
      apiClientId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cliente API' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.getById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear cliente API',
    description:
      'Devuelve clientSecret y apiKey **una sola vez**. Scopes + rate limit (RN-114).',
  })
  @ApiCreatedResponse({ description: 'Cliente creado con credenciales' })
  create(@Body() dto: CreateApiClientDto) {
    return this.clients.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar cliente API' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiClientDto,
  ) {
    return this.clients.update(id, dto);
  }

  @Post(':id/rotate')
  @ApiOperation({ summary: 'Rotar client_secret y API Key' })
  rotate(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.rotateCredentials(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar cliente API' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.deactivate(id);
  }
}
