# HU-011 — Administración del Carrito de Compras (Backend)

## Qué resuelve

Tras bloquear sillas (HU-010), el usuario autenticado centraliza la compra
en un carrito temporal antes del pago (HU-013):

```text
POST /functions/:id/seats   → locks (HU-010)
POST /cart                  → carrito + descuento membresía (RN-047)
GET  /cart                  → resumen / totales (renueva TTL)
PUT  /cart                  → quitar sillas / snacks provisionales
POST /cart/apply-membership → reafirma descuento
POST /cart/apply-promo      → cupón demo (RN-048)
DELETE /cart                → cancela + libera sillas
```

Catálogo real de confitería y stock = **HU-012** (`GET /snacks`, `POST|PUT|DELETE /cart/snacks`).
Pasarela / orden = **HU-013**. Promos admin = **HU-026**. Giftcards = **HU-018**.

## Endpoints

Prefijo global: `/api/v1` · todos requieren `Authorization: Bearer <access>`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/cart` | Crea desde reserva de sillas (`reservationId` opcional) |
| `GET` | `/cart` | Carrito ACTIVE; renueva `expiresAt` (~10 min) |
| `PUT` | `/cart` | `removeSeatIds` y/o `snacks` |
| `DELETE` | `/cart` | Cancela y libera locks |
| `POST` | `/cart/apply-membership` | Aplica % de membresía (RN-047) |
| `POST` | `/cart/apply-promo` | Cupón demo (`MULTICINE10`, `SNACK5K`) |

Swagger: http://localhost:3000/api/docs → tag **Cart**

### Body `POST /cart` (opcional)

```json
{ "reservationId": "uuid-de-la-reserva" }
```

### Body `PUT /cart`

```json
{
  "removeSeatIds": ["uuid-silla"],
  "snacks": [
    {
      "snackId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "name": "Crispetas grandes",
      "imageUrl": "https://cdn.example/popcorn.png",
      "quantity": 1,
      "unitPrice": 12000
    }
  ]
}
```

`snacks` reemplaza todas las líneas de confitería. Validación de stock → HU-012.

### Body `POST /cart/apply-promo`

```json
{ "code": "MULTICINE10" }
```

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-044** | Solo un carrito `ACTIVE` por usuario |
| **RN-045** | Locks de sillas se extienden con la actividad del carrito |
| **RN-046** | Expira tras ~10 min sin actividad (lazy en cada request) |
| **RN-047** | Descuento membresía automático (`benefitsForLevel`) |
| **RN-048** | Promos no apilables si `stackable = false` |

## Totales

```text
subtotal = tickets + snacks
− membershipDiscount
− promoDiscount
= base
+ tax (IVA 19% educativo)
− giftcardAmount (0 hasta HU-018)
= total
```

## Modelo incremental

```text
Cart (ACTIVE|EXPIRED|CANCELLED)
  → CartTicketItem (snapshot película/sala/precio)
  → CartSnackItem (estructura; catálogo HU-012)
SeatLock.expiresAt ← alineado a Cart.expiresAt (RN-045)
```

## Cómo probar

```bash
# 1) Login + lock sillas (HU-007 / HU-010)
# 2) Crear carrito
curl -X POST http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{}'

curl http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer <access>"

curl -X POST http://localhost:3000/api/v1/cart/apply-promo \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{"code":"MULTICINE10"}'

curl -X DELETE http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer <access>"
```

## Archivos clave

- `backend/src/cart/` — módulo completo
- `backend/src/seats/seats.service.ts` — `extendReservationExpiry` / `releaseSeatsByIds`
