# HU-010 — Selección Interactiva de Sillas (Backend)

## Qué resuelve

Tras elegir función (HU-009), el usuario ve el plano de la sala, bloquea
sillas ~10 minutos y obtiene un resumen de valor antes del carrito (HU-011):

```text
GET  /functions/:id/seats          → mapa + estados (JWT opcional)
POST /functions/:id/seats          → lock temporal + resumen (JWT)
GET  /reservations                 → reservas activas + resumen (JWT)
DELETE /reservations/release-seats → liberar locks (JWT)
```

La UI del mapa (colores/íconos) es frontend; la API entrega estados y layout.

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/functions/:id/seats` | Opcional | Plano con estados en tiempo real |
| `POST` | `/functions/:id/seats` | JWT | Bloqueo temporal (RN-039) |
| `GET` | `/reservations` | JWT | Selección(es) activa(s) + total |
| `DELETE` | `/reservations/release-seats` | JWT | Liberación manual (RN-040) |

Swagger: http://localhost:3000/api/docs → tags **Functions** y **Reservations**

### Body `POST /functions/:id/seats`

```json
{
  "seatIds": ["uuid-silla-1", "uuid-silla-2"],
  "acknowledgePreferential": true
}
```

`acknowledgePreferential` es obligatorio si hay sillas `PREFERENTIAL` (RN-042).

### Body `DELETE /reservations/release-seats` (opcional)

```json
{ "reservationId": "uuid-grupo" }
```

Sin body / sin `reservationId` → libera todos los locks temporales del usuario.

## Estados de silla (`status`)

| Status | Significado |
|---|---|
| `AVAILABLE` | Libre |
| `SELECTED` | Lock del usuario actual (requiere JWT en GET) |
| `LOCKED` | Lock de otro usuario |
| `SOLD` | Vendida |
| `DISABLED` | Inhabilitada en el layout |

Tipos físicos (`seatType`): `STANDARD` · `VIP` · `PREFERENTIAL` · `DISABLED`.

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-039** | Lock TTL = 10 minutos (`expiresAt`) |
| **RN-040** | Expiración perezosa en cada operación + `DELETE release-seats` |
| **RN-041** | No se pueden lockear SOLD / LOCKED / DISABLED |
| **RN-042** | Preferenciales exigen `acknowledgePreferential: true` |
| **RN-043** | Unique `(showtimeId, seatId)` + transacción anti doble-venta |

También: `maxSeatsPerOrder` por función (default 8; admin → HU-020).

## Modelo incremental

```text
Room → Seat (layout)
Showtime += maxSeatsPerOrder
SeatLock (LOCKED | SOLD) + reservationId + expiresAt
SeatLockAudit (LOCK | RELEASE | EXPIRE)
```

## Cómo probar

```bash
# Mapa público (functionId del seed / HU-009)
curl "http://localhost:3000/api/v1/functions/<functionId>/seats"

# Con JWT: ver SELECTED / mySelection
curl "http://localhost:3000/api/v1/functions/<functionId>/seats" \
  -H "Authorization: Bearer <access>"

# Bloquear (elige seatIds AVAILABLE del mapa)
curl -X POST "http://localhost:3000/api/v1/functions/<functionId>/seats" \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{"seatIds":["<seatId>"]}'

curl "http://localhost:3000/api/v1/reservations" \
  -H "Authorization: Bearer <access>"

curl -X DELETE "http://localhost:3000/api/v1/reservations/release-seats" \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Archivos clave

- `backend/src/seats/` — módulo completo
- `backend/src/auth/jwt/optional-jwt-auth.guard.ts` — JWT opcional en el mapa
- `backend/src/movies/entities/showtime.entity.ts` — `maxSeatsPerOrder`
