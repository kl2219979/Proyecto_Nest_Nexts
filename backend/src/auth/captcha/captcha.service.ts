import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Validación CAPTCHA del registro (HU-006).
 *
 * En desarrollo / sin proveedor externo se acepta el token configurado
 * en `CAPTCHA_DEV_TOKEN` (default `dev-ok`). Cuando exista un proveedor
 * real (reCAPTCHA, hCaptcha, …), este servicio es el único punto a
 * reemplazar (inversión de dependencias / Adapter).
 *
 * @remarks
 * **Patrón Adapter (simplificado):** aísla la verificación CAPTCHA del
 * resto del registro para poder cambiar el proveedor sin tocar
 * `AuthService`.
 */
@Injectable()
export class CaptchaService {
  /**
   * @param configService - Lee `CAPTCHA_DEV_TOKEN` del entorno.
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifica el token enviado por el cliente.
   *
   * @param token - Valor del campo `captchaToken`.
   * @throws {BadRequestException} Si el token es inválido o vacío.
   */
  verify(token: string): void {
    const expected = this.configService.get<string>(
      'CAPTCHA_DEV_TOKEN',
      'dev-ok',
    );
    if (!token || token !== expected) {
      throw new BadRequestException('CAPTCHA inválido');
    }
  }
}
