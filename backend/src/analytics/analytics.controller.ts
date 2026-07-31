import {
  Controller,
  Get,
  Header,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user.enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { DashboardExportService } from './dashboard-export.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

/**
 * Dashboard gerencial de indicadores (HU-025).
 *
 * Prefijo global `/api/v1` → `GET /api/v1/dashboard`.
 * Solo ADMIN / SUPER_ADMIN (gerente / backoffice).
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  /**
   * @param analytics - Agregador de KPIs.
   * @param exports - PDF / Excel.
   */
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly exports: DashboardExportService,
  ) {}

  /**
   * Tablero completo: KPIs, serie temporal, tops y comparativo.
   *
   * @param query - Período, fechas, ciudad/complejo, límite de rankings.
   * @returns JSON del dashboard.
   */
  @Get()
  @ApiOperation({
    summary: 'Dashboard gerencial de KPIs (HU-025)',
    description:
      'Agrega ventas, entradas, ocupación, snacks, Cine Flash, bonos, ' +
      'membresías, usuarios activos, conversión, cancelaciones, transferencias, ' +
      'ingresos, tops y comparativo vs. período anterior.',
  })
  getDashboard(@Query() query: DashboardQueryDto) {
    return this.analytics.getDashboard(query);
  }

  /**
   * Exporta el mismo tablero a PDF.
   *
   * @param query - Mismos filtros que `GET /dashboard`.
   * @returns Archivo PDF.
   */
  @Get('export.pdf')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="multicine-dashboard.pdf"',
  )
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Exportar dashboard a PDF' })
  async exportPdf(
    @Query() query: DashboardQueryDto,
  ): Promise<StreamableFile> {
    const data = await this.analytics.getDashboard(query);
    const buffer = await this.exports.buildPdf(data);
    return new StreamableFile(buffer);
  }

  /**
   * Exporta el tablero a CSV compatible con Excel.
   *
   * @param query - Mismos filtros que `GET /dashboard`.
   * @returns CSV (UTF-8 BOM).
   */
  @Get('export.xlsx')
  @Header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="multicine-dashboard.csv"',
  )
  @ApiProduces('application/vnd.ms-excel')
  @ApiOperation({
    summary: 'Exportar dashboard a Excel (CSV)',
    description:
      'CSV con BOM UTF-8 que Excel abre directamente. Incluye KPIs, serie y tops.',
  })
  async exportExcel(@Query() query: DashboardQueryDto): Promise<string> {
    const data = await this.analytics.getDashboard(query);
    return this.exports.buildExcelCsv(data);
  }
}
