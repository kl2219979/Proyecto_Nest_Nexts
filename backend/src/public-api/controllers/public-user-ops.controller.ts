import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LoginDto } from '../../auth/dto/login.dto';
import { RegisterDto } from '../../auth/dto/register.dto';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import type { AuthUser } from '../../auth/jwt/jwt.strategy';
import { GiftcardsService } from '../../giftcards/giftcards.service';
import { MembershipService } from '../../membership/membership.service';
import { ProfileService } from '../../profile/profile.service';
import { RescheduleService } from '../../reschedule/reschedule.service';
import {
  CurrentApiClient,
  RequireScopes,
} from '../decorators/api-client.decorators';
import type { AuthenticatedApiClient } from '../dto/api-client-response';
import { ApiClientScope } from '../enums/public-api.enums';
import { ApiClientAuthGuard } from '../guards/api-client-auth.guard';
import { ApiClientRateLimitGuard } from '../guards/api-client-rate-limit.guard';
import { ApiClientScopesGuard } from '../guards/api-client-scopes.guard';
import { PublicApiAuditInterceptor } from '../interceptors/public-api-audit.interceptor';

/**
 * Operaciones de usuario / órdenes vía API pública (HU-029).
 *
 * Auth de app: `X-API-Key` o OAuth client.
 * Auth de usuario (donde aplica): JWT Bearer (Authorization).
 */
@ApiTags('Public API · User ops')
@ApiSecurity('api-key')
@ApiHeader({
  name: 'X-API-Key',
  required: false,
  description: 'API Key del consumidor externo',
})
@Controller('public')
@UseGuards(ApiClientAuthGuard, ApiClientRateLimitGuard, ApiClientScopesGuard)
@UseInterceptors(PublicApiAuditInterceptor)
export class PublicUserOpsController {
  constructor(
    private readonly auth: AuthService,
    private readonly profile: ProfileService,
    private readonly membership: MembershipService,
    private readonly reschedule: RescheduleService,
    private readonly giftcards: GiftcardsService,
  ) {}

  @Post('auth/register')
  @RequireScopes(ApiClientScope.AUTH_WRITE)
  @ApiOperation({
    summary: 'Registro de usuario (API pública)',
    description: 'RN-115 · delega en AuthService (HU-006).',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('auth/login')
  @RequireScopes(ApiClientScope.AUTH_WRITE)
  @ApiOperation({
    summary: 'Login de usuario (API pública)',
    description: 'Devuelve Access/Refresh JWT de usuario final (HU-007).',
  })
  @ApiOkResponse({ description: 'Tokens de sesión' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @CurrentApiClient() _client: AuthenticatedApiClient,
  ) {
    return this.auth.login(dto, {
      ipAddress: this.clientIp(req),
      userAgent: this.userAgent(req),
    });
  }

  @Get('profile')
  @RequireScopes(ApiClientScope.USERS_READ)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Perfil del usuario autenticado',
    description: 'Requiere X-API-Key (app) + Authorization Bearer (usuario).',
  })
  profileMine(@CurrentUser() user: AuthUser) {
    return this.profile.getProfile(user.userId);
  }

  @Get('membership')
  @RequireScopes(ApiClientScope.USERS_READ)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membresía y beneficios del usuario' })
  membershipMine(@CurrentUser() user: AuthUser) {
    return this.membership.getDetailForUser(user.userId);
  }

  @Get('orders')
  @RequireScopes(ApiClientScope.ORDERS_READ)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar órdenes PAID del usuario' })
  ordersMine(@CurrentUser() user: AuthUser) {
    return this.reschedule.listPaidOrders(user.userId);
  }

  @Get('orders/:id')
  @RequireScopes(ApiClientScope.ORDERS_READ)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalle de una orden del usuario' })
  orderById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reschedule.getPaidOrderById(user.userId, id);
  }

  @Get('giftcards/:code')
  @RequireScopes(ApiClientScope.GIFTCARDS_READ)
  @ApiOperation({
    summary: 'Validar / consultar bono de regalo por código',
    description: 'Delegado a GiftcardsService.getByCode (HU-018).',
  })
  giftcardByCode(@Param('code') code: string) {
    return this.giftcards.getByCode(code);
  }

  private clientIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim() ?? null;
    }
    return req.ip ?? null;
  }

  private userAgent(req: Request): string | null {
    const ua = req.headers['user-agent'];
    return typeof ua === 'string' ? ua.slice(0, 512) : null;
  }
}
