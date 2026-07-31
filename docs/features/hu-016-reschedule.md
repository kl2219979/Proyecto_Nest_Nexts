# HU-016 — Cambio de Función / Reprogramación de Reserva (Backend)

## Qué resuelve

Permite reprogramar una compra **PAID** a otra función de la **misma película**,
sin cancelar la orden: se invalidan los QR anteriores, se eligen sillas nuevas,
se regeneran entradas y se ajusta la diferencia económica.

```text
GET  /orders
  → Mis compras (órdenes PAID + canReschedule)

GET  /orders/:id/available-functions?cityId=
  → Funciones futuras misma película (excluye la actual)

POST /functions/:newShowtimeId/seats
  → Lock temporal de sillas nuevas (HU-010)

PUT  /orders/:id/reschedule
  → Cancelar QR → liberar SOLD viejas → confirmar SOLD nuevas
  → Reescribir líneas de orden (mismo orderId) → regenerar tickets
  → Ajuste billetera + auditoría + correo FUNCTION_CHANGED

POST /tickets/regenerate
  → Reintento operativo de emisión de QR (si hace falta)
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/orders` | JWT | Listar compras PAID (Mis compras) |
| `GET` | `/orders/:id/available-functions` | JWT | Funciones alternativas |
| `PUT` | `/orders/:id/reschedule` | JWT | Confirmar cambio |
| `POST` | `/tickets/regenerate` | JWT | Regenerar QR de una orden |

`GET /reservations` (HU-010) sigue listando solo locks temporales, no compras.

Swagger: http://localhost:3000/api/docs → tags **Orders / Reschedule** / **Tickets**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-065** | Solo hasta 1 hora antes del inicio de la función original |
| **RN-066** | Solo funciones futuras (y activas) |
| **RN-067** | No se cambian funciones ya iniciadas |
| **RN-068** | QR anteriores → `CANCELLED` de inmediato |
| **RN-069** | Se conserva el mismo `orderId` |
| **RN-070** | Cada cambio queda en `reschedule_audits` |

## Ajuste económico

- Nueva subtotal de entradas − anterior:
  - **Negativo** → crédito a `wallet.balance` (saldo a favor).
  - **Positivo** → `surchargeAmount` en la respuesta/auditoría.
    - Con `paySurchargeFromWallet: true` se debita la billetera
      (falla si no hay saldo).
    - Por defecto no bloquea el cambio.

La factura original (HU-014) no se reescribe; es el comprobante de la compra inicial.

## Modelo incremental

```text
RescheduleAudit (orderId, old/new showtime, snapshots, priceDifference, credit, surcharge)
Ticket.orderTicketItemId → nullable (se limpia al CANCELLED para regenerar)
SeatLockAuditAction.RESCHEDULE_RELEASE
```

## Cómo probar

```bash
# Tras un pago APPROVED (ver HU-013 / HU-014):
curl http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN"

curl "http://localhost:3000/api/v1/orders/$ORDER_ID/available-functions?cityId=$CITY_ID" \
  -H "Authorization: Bearer $TOKEN"

# Lock sillas en la nueva función (misma cantidad):
curl -X POST http://localhost:3000/api/v1/functions/$NEW_SHOWTIME_ID/seats \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"seatIds":["..."]}'

curl -X PUT http://localhost:3000/api/v1/orders/$ORDER_ID/reschedule \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"newShowtimeId":"'"$NEW_SHOWTIME_ID"'","reservationId":"'"$RESERVATION_ID"'"}'
```

## Fuera de alcance

- Transferencia de entradas → **HU-017**
- Giftcards formales / recarga de billetera → **HU-018**
- Nota crédito fiscal formal sobre la factura → no pedido en esta HU
