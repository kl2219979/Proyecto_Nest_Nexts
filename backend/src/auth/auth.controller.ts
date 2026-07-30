import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ClientContext, LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  ActivateResult,
  AuthService,
  AuthTokensResult,
  RegisterResult,
} from './auth.service';

/**
 * Autenticación: registro (HU-006) + sesión JWT (HU-007).
 *
 * Prefijo global `/api/v1` → rutas bajo `/auth/*`.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  /**
   * @param authService - Registro, login, tokens y recuperación.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Alta de usuario + membresía digital automática (HU-006).
   *
   * @param dto - Formulario de registro.
   * @returns {Promise<RegisterResult>} Usuario inactivo + membresía.
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Registrar usuario y crear membresía digital',
    description:
      'RN-021…026. Cuenta inactiva hasta `POST /auth/activate`. CAPTCHA obligatorio.',
  })
  @ApiCreatedResponse({ description: 'Usuario y membresía creados' })
  @ApiConflictResponse({ description: 'Email duplicado (RN-021)' })
  @ApiBadRequestResponse({
    description: 'Validación, CAPTCHA o contraseña débil',
  })
  register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(dto);
  }

  /**
   * Confirma el correo y habilita la cuenta (RN-024).
   *
   * @param dto - Token del enlace de activación.
   * @returns {Promise<ActivateResult>} Cuenta activa.
   */
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Activar cuenta con token de correo',
    description:
      'Token válido 24 horas. Tras activar, la cuenta puede hacer login (HU-007).',
  })
  @ApiOkResponse({ description: 'Cuenta activada' })
  @ApiBadRequestResponse({ description: 'Token inválido o expirado' })
  activate(@Body() dto: ActivateAccountDto): Promise<ActivateResult> {
    return this.authService.activate(dto);
  }

  /**
   * Inicia sesión con email/password (HU-007).
   *
   * @param dto - Credenciales.
   * @param req - Request HTTP (IP / User-Agent).
   * @returns {Promise<AuthTokensResult>} Access + Refresh + perfil.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'RN-027…031. Emite Access JWT (15 min) y Refresh (7 días). Solo cuentas verificadas.',
  })
  @ApiOkResponse({ description: 'Tokens y datos de sesión' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiForbiddenResponse({
    description: 'Cuenta bloqueada o email no verificado',
  })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokensResult> {
    return this.authService.login(dto, this.clientContext(req));
  }

  /**
   * Renueva el Access Token sin reautenticar.
   *
   * @param dto - Refresh token.
   * @returns {Promise<AuthTokensResult>} Nuevo Access Token.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Renovar Access Token',
    description:
      'Usa el Refresh Token vigente (7 días) para obtener un Access nuevo.',
  })
  @ApiOkResponse({ description: 'Nuevo Access Token' })
  @ApiUnauthorizedResponse({ description: 'Refresh inválido o expirado' })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensResult> {
    return this.authService.refresh(dto);
  }

  /**
   * Cierra sesión invalidando el Refresh Token.
   *
   * @param dto - Refresh a revocar.
   * @returns Confirmación.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Revoca el Refresh Token indicado.',
  })
  @ApiOkResponse({ description: 'Sesión cerrada' })
  logout(@Body() dto: LogoutDto): Promise<{ message: string }> {
    return this.authService.logout(dto);
  }

  /**
   * Solicita correo de recuperación de contraseña.
   *
   * @param dto - Email.
   * @returns Mensaje genérico (no revela existencia).
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Olvidé mi contraseña',
    description:
      'Si el email existe y está verificado, registra token de reset (log hasta HU-015).',
  })
  @ApiOkResponse({ description: 'Mensaje genérico' })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  /**
   * Restablece la contraseña con el token del correo.
   *
   * @param dto - Token + nueva password.
   * @returns Confirmación.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description:
      'Aplica nueva contraseña (RN-022/023) e invalida sesiones activas.',
  })
  @ApiOkResponse({ description: 'Contraseña actualizada' })
  @ApiBadRequestResponse({ description: 'Token inválido o password débil' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  /**
   * Extrae IP y User-Agent para auditoría.
   *
   * @param req - Request Express.
   * @returns Contexto de cliente.
   */
  private clientContext(req: Request): ClientContext {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim();
    return {
      ipAddress: forwardedIp || req.ip || null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }
}
