# HU-012 — Compra de Productos de Confitería (Backend)

## Qué resuelve

Desde el carrito (HU-011), el usuario consulta el catálogo digital de
confitería, agrega productos y actualiza totales antes del pago:

```text
GET  /snacks                 → catálogo por categoría (+ filtro cine)
POST /cart/snacks            → agregar (valida stock, no descuenta)
PUT  /cart/snacks            → cambiar cantidad
DELETE /cart/snacks          → quitar / reducir
GET  /cart                   → totales con snacks + pickup del complejo
```

Descuento de inventario real = **HU-013** (`SnacksService.decrementStock` tras webhook APPROVED, RN-052).
CRUD admin del menú = **HU-020**. Promos avanzadas = **HU-026**.

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/snacks` | No | Catálogo activo agrupado por categoría |
| `POST` | `/cart/snacks` | JWT | Agregar / sumar cantidad |
| `PUT` | `/cart/snacks` | JWT | Fijar cantidad de un snack |
| `DELETE` | `/cart/snacks` | JWT | Quitar línea o restar unidades |

Swagger: http://localhost:3000/api/docs → tags **Snacks** y **Cart**

### Query `GET /snacks`

```text
?cinemaId=<uuid>   # globales + exclusivos del complejo
&category=POPCORN  # enum SnackCategory
```

### Body `POST /cart/snacks` / `PUT /cart/snacks`

```json
{ "snackId": "uuid", "quantity": 2 }
```

### Body `DELETE /cart/snacks`

```json
{ "snackId": "uuid", "quantity": 1 }
```

Sin `quantity` elimina la línea completa.

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-049** | No vender si `stock < quantity` (incluye stock 0) |
| **RN-050** | `promoLabel` / `promoPercent` en producto (stub; admin = HU-026) |
| **RN-051** | Descuento membresía `SNACK_*` en totales del carrito |
| **RN-052** | Stock **no** baja al agregar al carrito (solo tras pago) |

## Pickup

El carrito expone `pickup.cinemaId` / `cinemaName` = complejo de la
función asociada. Productos con `cinemaId` distinto se rechazan.

## Modelo incremental

```text
Snack (category, price, stock, cinemaId?, promo*)
Cart → CartSnackItem (snapshot name/price/qty desde catálogo)
```

## Cómo probar

```bash
curl "http://localhost:3000/api/v1/snacks"
curl "http://localhost:3000/api/v1/snacks?category=POPCORN"

# Con carrito ACTIVE (tras HU-010/011):
curl -X POST http://localhost:3000/api/v1/cart/snacks \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{"snackId":"<id>","quantity":1}'

curl -X PUT http://localhost:3000/api/v1/cart/snacks \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{"snackId":"<id>","quantity":3}'

curl -X DELETE http://localhost:3000/api/v1/cart/snacks \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{"snackId":"<id>"}'
```

Seed incluye **Combo agotado demo** (`stock: 0`) para ejercitar RN-049.

## Archivos clave

- `backend/src/snacks/` — catálogo + seed
- `backend/src/cart/cart.service.ts` — `addSnack` / `updateSnack` / `removeSnack`
