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
import { AdminPaginationQueryDto } from '../dto/admin-pagination.dto';
import {
  CreateCinemaDto,
  CreateRoomDto,
  UpdateCinemaDto,
  UpdateRoomDto,
  UpdateSeatDto,
  UpsertSeatLayoutDto,
} from '../dto/admin-write.dto';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';
import { AdminCatalogService } from '../services/admin-catalog.service';

/**
 * CRUD complejos, salas y distribución de sillas (HU-020).
 */
@ApiTags('Admin · Venues')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminVenuesController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get('cinemas')
  @ApiOperation({ summary: 'Listar complejos' })
  listCinemas(
    @Query() query: AdminPaginationQueryDto,
    @Query('cityId') cityId?: string,
  ) {
    return this.catalog.listCinemas(query, cityId);
  }

  @Post('cinemas')
  @ApiOperation({ summary: 'Crear complejo' })
  createCinema(@Body() dto: CreateCinemaDto) {
    return this.catalog.createCinema(dto);
  }

  @Put('cinemas/:id')
  @ApiOperation({ summary: 'Actualizar complejo' })
  updateCinema(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCinemaDto,
  ) {
    return this.catalog.updateCinema(id, dto);
  }

  @Delete('cinemas/:id')
  @ApiOperation({ summary: 'Eliminar complejo' })
  deleteCinema(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteCinema(id);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Listar salas' })
  listRooms(@Query('cinemaId') cinemaId?: string) {
    return this.catalog.listRooms(cinemaId);
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Crear sala' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.catalog.createRoom(dto);
  }

  @Put('rooms/:id')
  @ApiOperation({ summary: 'Actualizar sala' })
  updateRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.catalog.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Eliminar sala' })
  deleteRoom(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteRoom(id);
  }

  @Get('rooms/:roomId/seats')
  @ApiOperation({ summary: 'Listar plano de sillas de una sala' })
  listSeats(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.catalog.listSeats(roomId);
  }

  @Post('rooms/:roomId/seats')
  @ApiOperation({ summary: 'Crear / reemplazar plano de sillas' })
  upsertSeats(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpsertSeatLayoutDto,
  ) {
    return this.catalog.upsertSeatLayout(roomId, dto);
  }

  @Put('seats/:id')
  @ApiOperation({ summary: 'Actualizar una silla' })
  updateSeat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeatDto,
  ) {
    return this.catalog.updateSeat(id, dto);
  }

  @Delete('seats/:id')
  @ApiOperation({ summary: 'Eliminar una silla' })
  deleteSeat(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteSeat(id);
  }
}
