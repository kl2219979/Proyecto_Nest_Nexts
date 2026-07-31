/**
 * Vista de una transferencia de entradas (HU-017).
 */
export type TicketTransferView = {
  id: string;
  status: string;
  fromUserId: string;
  toUserId: string | null;
  toEmail: string;
  toName: string;
  toDocumentType: string;
  toDocumentNumber: string;
  recipientInvited: boolean;
  orderId: string;
  movieTitle: string;
  startsAt: string;
  sourceTicketIds: string[];
  cancelledTicketIds: string[];
  newTicketIds: string[];
  acceptToken: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

/** Respuesta de solicitud de cesión. */
export type TransferCreateResponse = {
  transfer: TicketTransferView;
  message: string;
};

/** Respuesta tras aceptar (incluye nuevas entradas). */
export type TransferAcceptResponse = {
  transfer: TicketTransferView;
  newTickets: Array<{
    id: string;
    code: string;
    qrPayload: string;
    seatLabel: string;
    status: string;
  }>;
  message: string;
};

/** Listado enviado / recibido. */
export type TransferListResponse = {
  sent: TicketTransferView[];
  received: TicketTransferView[];
};
