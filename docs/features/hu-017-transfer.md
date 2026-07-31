# HU-017 — Transferencia de Entradas a Otro Usuario (Backend)

## Qué resuelve

Permite ceder una o varias entradas digitales a otro asistente
**sin cambiar la capacidad de la sala** ni reescribir la orden/factura
del comprador original.

```text
POST /tickets/transfer
  → Valida RN-071/072 · crea PENDING · correo (aceptar o invitar)

GET  /tickets/transfer
  → Enviadas / recibidas del JWT

POST /tickets/transfer/accept
  → Destinatario acepta (RN-073)
  → Anula QR viejos (RN-074) · emite nuevos · auditoría (RN-075)
```

Si el destinatario **no tiene cuenta**, se envía invitación a registrarse.
Tras activar el correo, se enlaza `toUserId`; aún debe **aceptar**.

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/tickets/transfer` | JWT | Solicitar cesión |
| `GET` | `/tickets/transfer` | JWT | Listar enviadas/recibidas |
| `POST` | `/tickets/transfer/accept` | JWT | Aceptar (transferId o acceptToken) |

Swagger: http://localhost:3000/api/docs → tag **Tickets / Transfer**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-071** | Solo hasta 1 hora antes del inicio de la función |
| **RN-072** | Cada entrada solo una vez (`Ticket.transferCount ≥ 1` bloquea) |
| **RN-073** | El destinatario debe aceptar; el QR no cambia antes |
| **RN-074** | Al aceptar: origen → `CANCELLED` + nuevos `VALID` |
| **RN-075** | Registro en `ticket_transfers` (auditoría) |

## Datos solicitados al transferir

- Nombre del nuevo asistente
- Correo electrónico
- Tipo y número de documento

## Modelo incremental

```text
TicketTransfer (PENDING → ACCEPTED | CANCELLED | EXPIRED)
Ticket.transferCount (0 = transferible)
TicketsService.cancelTicketsByIds / emitTicketsForTransfer
EmailTemplate.TICKET_TRANSFER (request / invite / accepted / sender_notice)
```

La **orden** y la **factura** siguen del comprador original.
Solo cambia el titular (`Ticket.userId`) y el QR.

## Cómo probar

```bash
# Tras un pago APPROVED y con entradas VALID:
curl -X POST http://localhost:3000/api/v1/tickets/transfer \
  -H "Authorization: Bearer $TOKEN_EMISOR" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds":["'"$TICKET_ID"'"],
    "recipientName":"Ana Pérez",
    "recipientEmail":"ana@example.com",
    "recipientDocumentType":"CC",
    "recipientDocumentNumber":"1020304050"
  }'

curl http://localhost:3000/api/v1/tickets/transfer \
  -H "Authorization: Bearer $TOKEN_DESTINATARIO"

curl -X POST http://localhost:3000/api/v1/tickets/transfer/accept \
  -H "Authorization: Bearer $TOKEN_DESTINATARIO" \
  -H "Content-Type: application/json" \
  -d '{"acceptToken":"'"$ACCEPT_TOKEN"'"}'
```

## Fuera de alcance

- Giftcards / bonos → **HU-018**
- Reprogramación de función → **HU-016** (ya hecha)
- Escaneo en puerta → **HU-024** (valida el QR nuevo)
