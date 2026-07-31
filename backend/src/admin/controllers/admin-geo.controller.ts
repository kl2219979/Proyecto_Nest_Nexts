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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user.enums';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import {
  CreateCityDto,
  CreateCountryDto,
  CreateDepartmentDto,
  UpdateCityDto,
  UpdateCountryDto,
  UpdateDepartmentDto,
} from '../dto/admin-write.dto';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';
import { AdminCatalogService } from '../services/admin-catalog.service';

/**
 * CRUD geográfico del backoffice (HU-020).
 *
 * Rutas bajo `/api/admin/*` (sin prefijo `v1`).
 */
@ApiTags('Admin · Geo')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminGeoController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Listar países' })
  listCountries() {
    return this.catalog.listCountries();
  }

  @Post('countries')
  @ApiOperation({ summary: 'Crear país' })
  createCountry(@Body() dto: CreateCountryDto) {
    return this.catalog.createCountry(dto);
  }

  @Put('countries/:id')
  @ApiOperation({ summary: 'Actualizar país' })
  updateCountry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCountryDto,
  ) {
    return this.catalog.updateCountry(id, dto);
  }

  @Delete('countries/:id')
  @ApiOperation({ summary: 'Eliminar país' })
  deleteCountry(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteCountry(id);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Listar departamentos' })
  listDepartments(@Query('countryId') countryId?: string) {
    return this.catalog.listDepartments(countryId);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Crear departamento' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.catalog.createDepartment(dto);
  }

  @Put('departments/:id')
  @ApiOperation({ summary: 'Actualizar departamento' })
  updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.catalog.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Eliminar departamento' })
  deleteDepartment(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteDepartment(id);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Listar ciudades' })
  listCities(@Query('departmentId') departmentId?: string) {
    return this.catalog.listCities(departmentId);
  }

  @Post('cities')
  @ApiOperation({ summary: 'Crear ciudad' })
  createCity(@Body() dto: CreateCityDto) {
    return this.catalog.createCity(dto);
  }

  @Put('cities/:id')
  @ApiOperation({ summary: 'Actualizar ciudad' })
  updateCity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCityDto,
  ) {
    return this.catalog.updateCity(id, dto);
  }

  @Delete('cities/:id')
  @ApiOperation({ summary: 'Eliminar ciudad' })
  deleteCity(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteCity(id);
  }
}
