import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

/** Payload plano que se cifra antes de “enviar” a la pasarela. */
export type GatewayChargePayload = {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  method: string;
  /** Token — nunca PAN. */
  paymentMethodToken: string | null;
  bankCode: string | null;
  reservationId: string;
  customerUserId: string;
};

export type GatewayChargeResult = {
  gatewayReference: string;
  checkoutUrl: string;
  encryptedPayload: string;
};

/**
 * Adaptador de pasarela de pagos (stub educativo, HU-013).
 *
 * @remarks
 * **Patrón:** Adapter.
 * Problema que resuelve: aislar cifrado AES-256, tokenización y firma
 * HMAC del dominio de órdenes, para poder sustituir el stub por un
 * proveedor real (Wompi, PayU, etc.) sin tocar `PaymentsService`.
 *
 * Seguridad:
 * - AES-256-GCM sobre el payload hacia la pasarela.
 * - HMAC-SHA256 para validar webhooks (RN-053).
 * - No almacena ni acepta datos de tarjeta en claro.
 */
@Injectable()
export class PaymentGatewayService {
  /**
   * @param config - Lee `PAYMENT_AES_KEY` y `PAYMENT_WEBHOOK_SECRET`.
   */
  constructor(private readonly config: ConfigService) {}

  /**
   * Cifra el cobro y genera referencia + URL de checkout demo.
   *
   * @param payload - Datos sin PAN/CVV.
   * @returns Referencia, URL y ciphertext.
   */
  createCharge(payload: GatewayChargePayload): GatewayChargeResult {
    const gatewayReference = `gw_${randomBytes(12).toString('hex')}`;
    const encryptedPayload = this.encrypt(payload);
    const publicUrl =
      this.config.get<string>('APP_PUBLIC_URL') ?? 'http://localhost:3000';
    const checkoutUrl = `${publicUrl.replace(/\/$/, '')}/payments/checkout-demo?ref=${gatewayReference}`;

    return { gatewayReference, checkoutUrl, encryptedPayload };
  }

  /**
   * Verifica firma HMAC del webhook (`x-payment-signature`).
   *
   * Formato esperado: hex(HMAC-SHA256(secret, `${gatewayReference}:${status}:${amount}`)).
   *
   * @param gatewayReference - Ref del cobro.
   * @param status - APPROVED | REJECTED.
   * @param amount - Monto (string normalizado a 2 decimales).
   * @param signatureHeader - Header recibido.
   * @returns `true` si la firma es válida.
   */
  verifyWebhookSignature(
    gatewayReference: string,
    status: string,
    amount: number,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader) {
      return false;
    }
    const expected = this.signWebhook(gatewayReference, status, amount);
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(signatureHeader.trim(), 'hex');
      if (a.length !== b.length) {
        return false;
      }
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * Firma un webhook (útil en tests y demos).
   *
   * @param gatewayReference - Ref.
   * @param status - Estado.
   * @param amount - Monto.
   * @returns Hex HMAC-SHA256.
   */
  signWebhook(
    gatewayReference: string,
    status: string,
    amount: number,
  ): string {
    const secret = this.webhookSecret();
    const amountNorm = Number(amount).toFixed(2);
    const message = `${gatewayReference}:${status}:${amountNorm}`;
    return createHmac('sha256', secret).update(message).digest('hex');
  }

  /**
   * Cifrado AES-256-GCM. Formato: `iv:authTag:ciphertext` (hex).
   *
   * @param data - Objeto serializable.
   * @returns Cadena cifrada.
   */
  encrypt(data: unknown): string {
    const key = this.aesKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plain = Buffer.from(JSON.stringify(data), 'utf8');
    const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  /**
   * Descifra un payload (tests / depuración). No se usa en el flujo feliz.
   *
   * @param packed - `iv:tag:ciphertext`.
   * @returns Objeto original.
   */
  decrypt<T = unknown>(packed: string): T {
    const [ivHex, tagHex, dataHex] = packed.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Formato de ciphertext inválido');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.aesKey(),
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return JSON.parse(dec.toString('utf8')) as T;
  }

  /** Clave 32 bytes desde hex (64 chars) o hash del secreto de desarrollo. */
  private aesKey(): Buffer {
    const raw =
      this.config.get<string>('PAYMENT_AES_KEY') ??
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    /** Fallback: deriva 32 bytes con SHA-256 del string (solo dev). */
    return createHmac('sha256', 'multicine-aes-salt').update(raw).digest();
  }

  private webhookSecret(): string {
    return (
      this.config.get<string>('PAYMENT_WEBHOOK_SECRET') ??
      'dev-payment-webhook-secret'
    );
  }
}
