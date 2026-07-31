import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { AdminPaginationQueryDto } from '../dto/admin-pagination.dto';
import {
  CreateMovieDto,
  CreateShowtimeDto,
  CreateSnackDto,
  UpdateMovieDto,
  UpdateShowtimeDto,
  UpdateSnackDto,
} from '../dto/admin-write.dto';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';
import { AdminContentService } from '../services/admin-content.service';

/**
 * CRUD películas, funciones y confitería (HU-020).
 */
@ApiTags('Admin · Content')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  // Movies

  @Get('movies')
  @ApiOperation({ summary: 'Listar películas' })
  listMovies(@Query() query: AdminPaginationQueryDto) {
    return this.content.listMovies(query);
  }

  @Get('movies/:id')
  @ApiOperation({ summary: 'Detalle de película (admin)' })
  getMovie(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getMovie(id);
  }

  @Post('movies')
  @ApiOperation({ summary: 'Crear película' })
  createMovie(@Body() dto: CreateMovieDto) {
    return this.content.createMovie(dto);
  }

  @Put('movies/:id')
  @ApiOperation({ summary: 'Editar película' })
  updateMovie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMovieDto,
  ) {
    return this.content.updateMovie(id, dto);
  }

  @Post('movies/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publicar película (isActive=true)' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.setPublished(id, true);
  }

  @Post('movies/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Despublicar película (isActive=false)' })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.setPublished(id, false);
  }

  @Post('movies/:id/promote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Promover UPCOMING → NOW_SHOWING y notificar (RN-020)',
  })
  promote(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.promoteToNowShowing(id);
  }

  @Delete('movies/:id')
  @ApiOperation({ summary: 'Desactivar película' })
  deleteMovie(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.deleteMovie(id);
  }

  // Showtimes

  @Get('showtimes')
  @ApiOperation({ summary: 'Listar funciones' })
  listShowtimes(
    @Query() query: AdminPaginationQueryDto,
    @Query('movieId') movieId?: string,
  ) {
    return this.content.listShowtimes(query, movieId);
  }

  @Post('showtimes')
  @ApiOperation({ summary: 'Crear función' })
  createShowtime(@Body() dto: CreateShowtimeDto) {
    return this.content.createShowtime(dto);
  }

  @Put('showtimes/:id')
  @ApiOperation({ summary: 'Editar función / precios' })
  updateShowtime(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.content.updateShowtime(id, dto);
  }

  @Post('showtimes/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar función (isActive=false)' })
  cancelShowtime(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.cancelShowtime(id);
  }

  @Delete('showtimes/:id')
  @ApiOperation({ summary: 'Eliminar función' })
  deleteShowtime(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.deleteShowtime(id);
  }

  // Snacks

  @Get('snacks')
  @ApiOperation({ summary: 'Listar confitería' })
  listSnacks(@Query() query: AdminPaginationQueryDto) {
    return this.content.listSnacks(query);
  }

  @Post('snacks')
  @ApiOperation({ summary: 'Crear producto de confitería' })
  createSnack(@Body() dto: CreateSnackDto) {
    return this.content.createSnack(dto);
  }

  @Put('snacks/:id')
  @ApiOperation({ summary: 'Actualizar snack / inventario' })
  updateSnack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSnackDto,
  ) {
    return this.content.updateSnack(id, dto);
  }

  @Delete('snacks/:id')
  @ApiOperation({ summary: 'Desactivar snack' })
  deleteSnack(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.deleteSnack(id);
  }
}
