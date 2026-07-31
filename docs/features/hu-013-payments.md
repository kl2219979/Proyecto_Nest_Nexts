# HU-013 — Proceso de Pago Seguro (Backend)

## Qué resuelve

Tras armar el carrito (HU-011/012), el usuario inicia un cobro con
múltiples medios. La venta **solo** se confirma cuando la pasarela
notifica por webhook firmado (RN-053):

```text
POST /payments              → orden + pago PENDING (JWT)
GET  /payments              → mis pagos
GET  /payments/:id          → detalle
POST /payments/webhook      → APPROVED | REJECTED (HMAC, sin JWT)
```

Tickets PDF/QR y factura electrónica = **HU-014** (tras APPROVED:
`fulfillment.tickets/invoice = GENERATED`).

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/payments` | JWT | Iniciar cobro del carrito ACTIVE |
| `GET` | `/payments` | JWT | Listar pagos del usuario |
| `GET` | `/payments/:id` | JWT | Detalle de un pago propio |
| `POST` | `/payments/webhook` | Firma HMAC | Confirmación de pasarela |

Swagger: http://localhost:3000/api/docs → tag **Payments**

### Body `POST /payments`

```json
{
  "method": "CREDIT_CARD",
  "paymentMethodToken": "tok_demo_visa_4242",
  "idempotencyKey": "checkout-user-001"
}
```

Medios: `CREDIT_CARD` | `DEBIT_CARD` | `PSE` | `NEQUI` | `DAVIPLATA`.
Tarjeta exige token (nunca PAN/CVV).

### Body `POST /payments/webhook`

```json
{
  "gatewayReference": "gw_…",
  "status": "APPROVED"
}
```

Header obligatorio:

```text
x-payment-signature: <hex HMAC-SHA256>
```

Mensaje firmado: `{gatewayReference}:{status}:{amount}` con
`amount` a 2 decimales (ej. `38080.00`) y secreto
`PAYMENT_WEBHOOK_SECRET`.

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-053** | No marcar PAID/SOLD sin webhook con firma válida |
| **RN-054** | `REJECTED` → libera sillas y cancela carrito/orden |
| **RN-055** | Cada evento queda en `payment_audits` |
| **RN-056** | Unique `idempotencyKey` + un solo PENDING/APPROVED por reserva |
| **RN-052** | Stock de snacks baja solo en APPROVED |

## Flujo

```text
Carrito ACTIVE
  → POST /payments (valida sillas + stock, cifra AES-256)
  → Cart CHECKOUT · Payment PENDING · Order PENDING
  → Redirect checkoutUrl (demo)
  → POST /payments/webhook APPROVED
      · SeatLock LOCKED → SOLD · soldSeats++
      · Snack stock −
      · Order PAID · Cart COMPLETED
      · tickets + factura GENERATED (HU-014)
  → (o REJECTED → RELEASE seats, Order FAILED)
```

## Seguridad

- JWT en creación/consulta.
- AES-256-GCM del payload hacia la pasarela (`PaymentGatewayService` = Adapter).
- Tokenización: solo `paymentMethodToken`.
- Webhook autenticado por HMAC (timing-safe compare).

## Modelo incremental

```text
Order (+ OrderTicketItem, OrderSnackItem)
Payment (idempotencyKey, gatewayReference, encryptedPayload)
PaymentAudit
CartStatus += CHECKOUT | COMPLETED
SeatLockAuditAction += SELL
```

## Cómo probar

```bash
# 1) Tras login + sillas + carrito ACTIVE:
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"NEQUI","idempotencyKey":"demo-pay-001"}'

# 2) Firmar y confirmar (Node one-liner con el mismo secreto):
# message = `${gatewayReference}:APPROVED:${amount.toFixed(2)}`
curl -X POST http://localhost:3000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-payment-signature: $SIG" \
  -d '{"gatewayReference":"gw_…","status":"APPROVED"}'
```

En tests unitarios, `PaymentGatewayService.signWebhook` genera la firma.

## Fuera de alcance (siguientes HUs)

| Tema | HU |
|---|---|
| Entradas PDF + QR único | HU-014 |
| Factura / comprobante | HU-014 |
| Email de compra / pago fallido | HU-015 |
| Pasarela bancaria real | Integración futura (Adapter listo) |
