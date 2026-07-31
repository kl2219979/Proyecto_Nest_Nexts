import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user.enums';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../../auth/jwt/jwt.strategy';
import { OrderStatus } from '../../payments/enums/payment.enums';
import { AdminPaginationQueryDto } from '../dto/admin-pagination.dto';
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from '../dto/admin-write.dto';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminSalesService } from '../services/admin-sales.service';
import { AdminUsersService } from '../services/admin-users.service';

/**
 * Usuarios, roles, ventas, reportes y auditoría (HU-020).
 */
@ApiTags('Admin · Ops')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AdminAuditInterceptor)
export class AdminOpsController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly sales: AdminSalesService,
    private readonly audit: AdminAuditService,
  ) {}

  // Roles

  @Get('roles')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar roles RBAC' })
  listRoles() {
    return this.users.listRoles();
  }

  // Users

  @Get('users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar usuarios' })
  listUsers(
    @Query() query: AdminPaginationQueryDto,
    @Query('role') role?: UserRole,
  ) {
    return this.users.listUsers(query, role);
  }

  @Get('users/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Detalle de usuario' })
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getUser(id);
  }

  @Post('users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear colaborador (STAFF/ADMIN)' })
  createUser(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.users.createUser(dto, actor.role);
  }

  @Put('users/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar rol / bloqueo / activo' })
  updateUser(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.users.updateUser(id, dto, {
      userId: actor.userId,
      role: actor.role,
    });
  }

  // Sales

  @Get('orders')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar órdenes' })
  listOrders(
    @Query() query: AdminPaginationQueryDto,
    @Query('status') status?: OrderStatus,
  ) {
    return this.sales.listOrders(query, status);
  }

  @Get('orders/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Detalle de orden' })
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.sales.getOrder(id);
  }

  @Get('payments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar pagos' })
  listPayments(@Query() query: AdminPaginationQueryDto) {
    return this.sales.listPayments(query);
  }

  @Get('invoices')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar facturas' })
  listInvoices(@Query() query: AdminPaginationQueryDto) {
    return this.sales.listInvoices(query);
  }

  // Reports

  @Get('reports/daily-sales')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reporte ventas diarias' })
  dailySales(@Query('from') from?: string, @Query('to') to?: string) {
    return this.sales.reportDailySales(from, to);
  }

  @Get('reports/daily-sales.csv')
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="daily-sales.csv"')
  @ApiOperation({ summary: 'Exportar ventas diarias CSV' })
  exportDailySales(@Query('from') from?: string, @Query('to') to?: string) {
    return this.sales.exportDailySalesCsv(from, to);
  }

  @Get('reports/occupation')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ocupación por sala' })
  occupation() {
    return this.sales.reportOccupationByRoom();
  }

  @Get('reports/top-movies')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Películas más vendidas' })
  topMovies(@Query('limit') limit?: string) {
    return this.sales.reportTopMovies(limit ? Number(limit) : 10);
  }

  @Get('reports/top-snacks')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Confitería más vendida' })
  topSnacks(@Query('limit') limit?: string) {
    return this.sales.reportTopSnacks(limit ? Number(limit) : 10);
  }

  @Get('reports/memberships')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Conteo de membresías por nivel' })
  memberships() {
    return this.sales.reportMemberships();
  }

  @Get('reports/payments-summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resumen de pagos por estado' })
  paymentsSummary() {
    return this.sales.paymentStatusSummary();
  }

  // Audit

  @Get('audit-logs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Historial de auditoría admin (RN-087)' })
  auditLogs(
    @Query('limit') limit?: string,
    @Query('resource') resource?: string,
  ) {
    return this.audit.list(limit ? Number(limit) : 100, resource);
  }
}
