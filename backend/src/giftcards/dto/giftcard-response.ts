import { GiftcardStatus, GiftcardTheme } from '../enums/giftcard.enums';

/**
 * Vista pública de un bono (sin secretos de pago).
 */
export type GiftcardView = {
  id: string;
  code: string;
  qrPayload: string;
  recipientName: string;
  recipientEmail: string;
  message: string | null;
  theme: GiftcardTheme;
  faceValue: number;
  remainingBalance: number;
  allowPartialUse: boolean;
  status: GiftcardStatus;
  expiresAt: string;
  scheduledSendAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

/**
 * Respuesta de compra: bono + datos de checkout (pasarela).
 */
export type GiftcardPurchaseResponse = {
  giftcard: GiftcardView;
  payment: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    gatewayReference: string;
    checkoutUrl: string | null;
    amount: number;
    currency: string;
  };
};

/**
 * Listado del usuario (comprados + recibidos por email).
 */
export type GiftcardListResponse = {
  purchased: GiftcardView[];
  received: GiftcardView[];
  total: number;
};

/**
 * Resultado de redención a billetera.
 */
export type GiftcardRedeemResponse = {
  giftcard: GiftcardView;
  creditedAmount: number;
  walletBalance: string;
};

/**
 * Resultado del webhook de giftcard.
 */
export type GiftcardWebhookResult = {
  accepted: boolean;
  giftcard: GiftcardView;
  message: string;
};
