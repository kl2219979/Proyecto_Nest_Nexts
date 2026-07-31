# HU-018 — Compra y Envío de Bonos de Regalo Digitales (Backend)

## Qué resuelve

Permite **comprar bonos digitales**, entregarlos por correo (inmediato o
programado) y **redimirlos** en billetera o en el carrito (entradas +
confitería).

```text
POST /giftcards
  → PENDING_PAYMENT + checkout pasarela (HMAC)

POST /giftcards/webhook (APPROVED)
  → ACTIVE + código/QR (RN-076) + correo (o cron si programado)

GET  /giftcards · GET /giftcards/:code
POST /giftcards/redeem          → crédito Wallet
POST /cart/apply-giftcard       → descuento en checkout (RN-079)
  → al PAID de la orden se debita remainingBalance
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/giftcards` | JWT | Comprar bono (valor + destinatario + pago) |
| `GET` | `/giftcards` | JWT | Comprados + recibidos |
| `GET` | `/giftcards/:code` | — | Consultar saldo / estado |
| `POST` | `/giftcards/redeem` | JWT | Cargar saldo a billetera |
| `POST` | `/giftcards/webhook` | HMAC | Confirmar / rechazar cobro |
| `POST` | `/cart/apply-giftcard` | JWT | Aplicar bono al carrito |

Swagger: http://localhost:3000/api/docs → tag **Giftcards**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-076** | Código único `MCGC-…` + `qrPayload` |
| **RN-077** | Uso parcial si `allowPartialUse` (default true) |
| **RN-078** | `expiresAt` configurable (`expiresInDays` o `GIFTCARD_EXPIRY_DAYS`) |
| **RN-079** | Aplicable a entradas y confitería vía total del carrito |

## Datos de compra

- Valor: 20.000 / 50.000 / 100.000 COP o personalizado (10k–1M)
- Destinatario: nombre + email
- Mensaje opcional
- Tema: `BIRTHDAY` · `CHRISTMAS` · `ANNIVERSARY` · `VALENTINE` · `GENERIC`
- `scheduledSendAt` opcional (ISO futuro)

## Modelo incremental

```text
Giftcard (PENDING_PAYMENT → ACTIVE | CANCELLED → REDEEMED | EXPIRED)
Order.giftcardCode + giftcardAmount (débito al PAID)
Cart.giftcardCode / giftcardAmount (preview sin debitar)
EmailTemplate.GIFTCARD + GiftcardDeliveryJob (cron 5 min)
Wallet.balance (vía POST /giftcards/redeem)
```

## Cómo probar

```bash
# 1) Comprar
curl -X POST http://localhost:3000/api/v1/giftcards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount":50000,
    "recipientName":"Ana Pérez",
    "recipientEmail":"ana@example.com",
    "message":"¡Disfruta el cine!",
    "theme":"BIRTHDAY",
    "method":"CREDIT_CARD",
    "paymentMethodToken":"tok_demo_visa_4242"
  }'

# 2) Webhook APPROVED (misma firma que pagos)
# message = "${gatewayReference}:APPROVED:${amount}"
# signature = HMAC-SHA256(PAYMENT_WEBHOOK_SECRET, message) en hex
curl -X POST http://localhost:3000/api/v1/giftcards/webhook \
  -H "Content-Type: application/json" \
  -H "x-payment-signature: $SIG" \
  -d '{"gatewayReference":"gw_…","status":"APPROVED"}'

# 3) Consultar / redimir / aplicar al carrito
curl http://localhost:3000/api/v1/giftcards/MCGC-XXXX
curl -X POST http://localhost:3000/api/v1/giftcards/redeem \
  -H "Authorization: Bearer $TOKEN_DEST" \
  -H "Content-Type: application/json" \
  -d '{"code":"MCGC-XXXX"}'
curl -X POST http://localhost:3000/api/v1/cart/apply-giftcard \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"MCGC-XXXX"}'
```

## Fuera de alcance

- Diseño gráfico del PDF del bono (solo payload QR + correo).
- Pasarela bancaria real (mismo stub HMAC/AES de HU-013).
- Fidelización / puntos → **HU-023**.
