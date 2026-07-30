import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../enums/payment.enums';

/** Línea de entrada en la respuesta de pago/orden. */
export type PaymentTicketView = {
  seatId: string;
  seatLabel: string;
  movieTitle: string;
  startsAt: string;
  roomName: string;
  cinemaName: string;
  format: string;
  unitPrice: number;
  lineTotal: number;
};

/** Línea de snack en la respuesta. */
export type PaymentSnackView = {
  snackId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

/** Vista de orden embebida. */
export type OrderView = {
  id: string;
  status: OrderStatus;
  currency: string;
  ticketsSubtotal: number;
  snacksSubtotal: number;
  subtotal: number;
  membershipDiscount: number;
  promoDiscount: number;
  giftcardAmount: number;
  tax: number;
  total: number;
  promoCode: string | null;
  cinemaId: string | null;
  cinemaName: string | null;
  ticketsGenerated: boolean;
  invoiceGenerated: boolean;
  tickets: PaymentTicketView[];
  snacks: PaymentSnackView[];
  createdAt: string;
};

/**
 * Respuesta de pago (creación, consulta, webhook).
 *
 * `checkoutUrl` es la URL demo de la “pasarela” (frontend redirige).
 * Confirmación real solo vía webhook (RN-053).
 */
export type PaymentResponse = {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: string;
  idempotencyKey: string;
  gatewayReference: string;
  /** URL educativa de redirección; el cobro no se confirma aquí. */
  checkoutUrl: string;
  order: OrderView;
  fulfillment: {
    seats: 'LOCKED' | 'SOLD' | 'RELEASED';
    snacksStock: 'RESERVED' | 'DECREMENTED' | 'UNCHANGED';
    /** HU-014 generará PDF/QR. */
    tickets: 'PENDING_HU_014' | 'SKIPPED';
    /** HU-014 generará factura. */
    invoice: 'PENDING_HU_014' | 'SKIPPED';
  };
  confirmedAt: string | null;
  createdAt: string;
};

/** Lista de pagos del usuario. */
export type PaymentListResponse = {
  items: PaymentResponse[];
  total: number;
};

/** Resultado de webhook. */
export type WebhookResult = {
  accepted: boolean;
  payment: PaymentResponse;
  message: string;
};
