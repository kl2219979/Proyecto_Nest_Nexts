/**
 * Línea de detalle dentro de la factura (snapshot JSON).
 */
export type InvoiceLineSnapshot = {
  kind: 'TICKET' | 'SNACK';
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Solo entradas. */
  seatLabel?: string;
  startsAt?: string;
};

/**
 * Vista pública de una entrada digital (HU-014).
 */
export type TicketView = {
  id: string;
  orderId: string;
  invoiceId: string | null;
  code: string;
  status: string;
  ticketType: string;
  movieTitle: string;
  startsAt: string;
  cinemaName: string;
  roomName: string;
  seatLabel: string;
  format: string;
  language: string;
  buyerName: string;
  /**
   * Payload único del QR (RN-057).
   * El PDF también lo embebe como imagen; el front puede re-renderizarlo.
   */
  qr: {
    payload: string;
    singleUse: true;
  };
  pdfUrl: string;
  usedAt: string | null;
  createdAt: string;
};

/** Lista de entradas del usuario (“Mis compras”). */
export type TicketListResponse = {
  items: TicketView[];
  total: number;
};

/**
 * Vista pública de factura / comprobante (HU-014).
 */
export type InvoiceView = {
  id: string;
  orderId: string;
  number: string;
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
  cinemaName: string | null;
  buyerName: string;
  buyerEmail: string;
  lines: InvoiceLineSnapshot[];
  termsText: string;
  ticketIds: string[];
  pdfUrl: string;
  issuedAt: string;
  createdAt: string;
};

/** Resultado interno al emitir documentos tras el pago. */
export type FulfillmentDocuments = {
  tickets: TicketView[];
  invoice: InvoiceView;
};
