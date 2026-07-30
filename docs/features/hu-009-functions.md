# HU-009 — Selección de Función y Formato de Proyección (Backend)

## Qué resuelve

Desde el detalle de una película, el usuario elige fecha, complejo, sala,
formato, idioma y audio antes de pasar al mapa de sillas (HU-010):

```text
GET /movies/:id/functions?cityId=…[&format=&date=&cinemaId=…]
  → funciones futuras/activas + facetas + disponibilidad
GET /functions/:id/prices
  → precio actualizado (formato/sala/horario) + promos (stub)
```

## Endpoints

Prefijo global: `/api/v1` · lectura pública (sin JWT)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/movies/:id/functions` | Funciones seleccionables + facetas |
| `GET` | `/functions/:id/prices` | Precio / disponibilidad de una función |

Query útiles en `/functions`:

- `cityId` (obligatorio)
- `date` (YYYY-MM-DD), `cinemaId`, `format`, `language`, `audioType`, `roomType`
- `available=true` → oculta agotadas

Swagger: http://localhost:3000/api/docs → tags **Movies** y **Functions**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-035** | Solo `startsAt > now` (ya iniciadas → 404 en prices) |
| **RN-036** | Solo `isActive = true` |
| **RN-037** | `price` / `basePrice` por función (formato + sala + horario) |
| **RN-038** | `promotions: []` hasta motor de cupones (HU-026); `finalPrice = basePrice` |

## Respuesta (resumen)

`GET /movies/:id/functions` incluye por ítem:

- `price`, `availableSeats`, `isSoldOut`, `isSelectable`
- `cinema`, `room`, `format`, `language`, `audioType`
- `facets` (fechas, formatos, idiomas, cines…) para filtrar en UI sin recarga

`GET /functions/:id/prices`:

- `basePrice`, `priceFactors`, `promotions`, `discountTotal`, `finalPrice`, `currency: COP`

## Cómo probar

```bash
# cityId + movieId del seed (HU-002 / HU-003)
curl "http://localhost:3000/api/v1/movies/<movieId>/functions?cityId=<cityId>"

curl "http://localhost:3000/api/v1/movies/<movieId>/functions?cityId=<cityId>&format=IMAX&available=true"

curl "http://localhost:3000/api/v1/functions/<functionId>/prices"
```

## Archivos clave

- `backend/src/movies/showtimes.service.ts`
- `backend/src/movies/functions.controller.ts`
- `backend/src/movies/movies.controller.ts` (`:id/functions`)
- `backend/src/movies/dto/movie-functions-*.ts`
