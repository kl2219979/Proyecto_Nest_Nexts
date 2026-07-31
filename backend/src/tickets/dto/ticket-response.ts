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
   * Veces que esta entrada ya fue cedida (HU-017 / RN-072).
   * `0` permite transferir; `≥1` bloquea una segunda cesión.
   */
  transferCount: number;
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
  /** Colaborador que validó en puerta (HU-024); null si aún no ingresó. */
  validatedByUserId: string | null;
  createdAt: string;
};

/** Lista de entradas del usuario (“Mis compras”). */
export type TicketListResponse = {
  items: TicketView[];
  total: number;
};

/**
 * Respuesta de `POST /tickets/validate` (HU-024).
 *
 * Incluye datos de función/sala para que el operador confirme el acceso
 * visualmente en el dispositivo de escaneo.
 */
export type TicketValidationResult = {
  /** `true` solo si el ingreso quedó registrado (VALID → USED). */
  allowed: true;
  message: string;
  ticket: {
    id: string;
    code: string;
    status: string;
    movieTitle: string;
    startsAt: string;
    cinemaName: string;
    roomName: string;
    seatLabel: string;
    format: string;
    language: string;
    buyerName: string;
    usedAt: string;
    validatedByUserId: string;
  };
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
