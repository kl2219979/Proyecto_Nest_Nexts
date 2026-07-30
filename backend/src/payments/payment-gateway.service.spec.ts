/**
 * Tests del adaptador de pasarela (AES + HMAC).
 */
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayService } from './payment-gateway.service';

describe('PaymentGatewayService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'APP_PUBLIC_URL') return 'http://localhost:3000';
      if (key === 'PAYMENT_AES_KEY') {
        return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      }
      if (key === 'PAYMENT_WEBHOOK_SECRET') return 'dev-payment-webhook-secret';
      return undefined;
    }),
  };

  const gateway = new PaymentGatewayService(config as unknown as ConfigService);

  it('cifra y descifra payload sin pérdida', () => {
    const payload = { orderId: 'o1', amount: 1000, method: 'PSE' };
    const enc = gateway.encrypt(payload);
    expect(enc.split(':')).toHaveLength(3);
    expect(gateway.decrypt(enc)).toEqual(payload);
  });

  it('createCharge genera referencia y ciphertext', () => {
    const result = gateway.createCharge({
      orderId: 'o1',
      paymentId: 'p1',
      amount: 5000,
      currency: 'COP',
      method: 'NEQUI',
      paymentMethodToken: null,
      bankCode: null,
      reservationId: 'r1',
      customerUserId: 'u1',
    });
    expect(result.gatewayReference).toMatch(/^gw_/);
    expect(result.checkoutUrl).toContain(result.gatewayReference);
    expect(result.encryptedPayload).toContain(':');
  });

  it('verifica firma HMAC de webhook', () => {
    const sig = gateway.signWebhook('gw_abc', 'APPROVED', 38080.5);
    expect(
      gateway.verifyWebhookSignature('gw_abc', 'APPROVED', 38080.5, sig),
    ).toBe(true);
    expect(
      gateway.verifyWebhookSignature('gw_abc', 'APPROVED', 38080.5, '00'),
    ).toBe(false);
  });
});
