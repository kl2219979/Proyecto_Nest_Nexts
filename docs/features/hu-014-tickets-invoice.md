# HU-014 — Entradas Digitales y Factura Electrónica (Backend)

## Qué resuelve

Tras el webhook APPROVED (HU-013), el sistema genera automáticamente:

```text
1 entrada digital + QR único por cada silla comprada (RN-057)
1 factura/comprobante electrónico por orden (1:1)
PDF re-descargable desde “Mis compras” (RN-059)
```

```text
POST /payments/webhook APPROVED
  → TicketsService.fulfillPaidOrder
  → Ticket(s) VALID + Invoice
  → order.ticketsGenerated / invoiceGenerated = true

GET  /tickets              → Mis entradas (JWT)
GET  /tickets/:id          → detalle + qr.payload
GET  /tickets/:id/pdf      → PDF con QR embebido
GET  /invoice/:id          → factura asociada
GET  /invoice/:id/pdf      → PDF del comprobante
```

Escaneo en puerta (`USED`) = **HU-024**. Envío por correo = **HU-015**.

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/tickets` | JWT | Listar mis entradas |
| `GET` | `/tickets/:id` | JWT | Detalle de una entrada |
| `GET` | `/tickets/:id/pdf` | JWT | Descargar PDF (RN-059) |
| `GET` | `/invoice/:id` | JWT | Consultar factura |
| `GET` | `/invoice/:id/pdf` | JWT | Descargar PDF factura |

Swagger: http://localhost:3000/api/docs → tags **Tickets** / **Invoice**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-057** | Cada entrada tiene `qrPayload` único (`MCQR-…`) |
| **RN-058** | Un QR es de un solo uso (`status` VALID → USED en HU-024) |
| **RN-059** | El PDF se regenera bajo demanda (no se guarda binario) |
| **RN-060** | Tras ingreso, el QR queda invalidado (`USED`; HU-024) |

## Contenido de la entrada (PDF)

Película, fecha/hora, complejo, sala, silla, formato, tipo, comprador,
código `TKT-…`, imagen QR y condiciones de uso.

## Factura

Número `FE-YYYYMMDD-XXXXXX`, líneas (entradas + snacks), descuentos,
IVA, total, datos del comprador y condiciones.

## Modelo incremental

```text
Ticket (orderId, orderTicketItemId, code, qrPayload, status, snapshot…)
Invoice (orderId único, number, totales, linesJson, termsText)
Order.ticketsGenerated / invoiceGenerated → true tras emitir
```

`GET /membership.purchaseHistory` ahora lista facturas del usuario.

## Cómo probar

```bash
# Tras un pago APPROVED (ver HU-013):
curl http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN"

curl -O -J http://localhost:3000/api/v1/tickets/<ticketId>/pdf \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:3000/api/v1/invoice/<invoiceId> \
  -H "Authorization: Bearer $TOKEN"
```

En la respuesta de pago, `fulfillment.tickets` / `invoice` pasan a
`GENERATED`.
