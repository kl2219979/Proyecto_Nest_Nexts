/**
 * Contratos de respuesta del carrito (HU-011).
 */

/** Entrada en el carrito. */
export type CartTicketView = {
  id: string;
  seatId: string;
  seatLabel: string;
  movieId: string;
  movieTitle: string;
  startsAt: string;
  roomName: string;
  cinemaName: string;
  format: string;
  language: string;
  unitPrice: number;
  /** Descuento membresía prorrateado en esta línea (informativo). */
  membershipDiscount: number;
  lineTotal: number;
};

/** Producto de confitería en el carrito. */
export type CartSnackView = {
  id: string;
  snackId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  membershipDiscount: number;
  lineTotal: number;
};

/** Totales del carrito. */
export type CartSummary = {
  currency: 'COP';
  ticketsSubtotal: number;
  snacksSubtotal: number;
  subtotal: number;
  membershipDiscount: number;
  promoDiscount: number;
  giftcardAmount: number;
  /** IVA calculado sobre (subtotal − descuentos) antes de giftcard. */
  tax: number;
  taxRate: number;
  total: number;
  seatCount: number;
  snackCount: number;
};

/** Vista completa del carrito activo. */
export type CartResponse = {
  id: string;
  status: string;
  reservationId: string;
  showtimeId: string;
  expiresAt: string;
  lastActivityAt: string;
  membershipDiscountApplied: boolean;
  membership: {
    level: string | null;
    ticketDiscountPercent: number;
    snackDiscountPercent: number;
  };
  promo: {
    code: string | null;
    discountAmount: number;
    stackable: boolean | null;
  };
  giftcard: {
    code: string | null;
    amount: number;
  };
  tickets: CartTicketView[];
  snacks: CartSnackView[];
  summary: CartSummary;
  createdAt: string;
};

/** Resultado de eliminar / expirar carrito. */
export type DeleteCartResult = {
  cartId: string;
  status: string;
  seatsReleased: number;
};
