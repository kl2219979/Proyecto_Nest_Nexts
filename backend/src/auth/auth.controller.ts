import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { RegisterDto } from './dto/register.dto';
import { ActivateResult, AuthService, RegisterResult } from './auth.service';

/**
 * Autenticación: registro y activación (HU-006).
 *
 * Login / JWT = HU-007.
 * Prefijo global `/api/v1` → rutas `/auth/register` y `/auth/activate`.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  /**
   * @param authService - Orquestación de alta y verificación de email.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Alta de usuario + membresía digital automática.
   *
   * Rate limit estricto: mitiga fuerza bruta / spam de registros.
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
      'Token válido 24 horas. Tras activar, la cuenta puede comprar (HUs posteriores) y hacer login (HU-007).',
  })
  @ApiOkResponse({ description: 'Cuenta activada' })
  @ApiBadRequestResponse({ description: 'Token inválido o expirado' })
  activate(@Body() dto: ActivateAccountDto): Promise<ActivateResult> {
    return this.authService.activate(dto);
  }
}
