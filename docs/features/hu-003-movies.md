# HU-003 — Cartelera semanal (Backend)

## Qué resuelve

Tras elegir ciudad (HU-002), el visitante consulta la **cartelera de los próximos 7 días** filtrada por esa ciudad.

```text
cityId → funciones activas (7 días) → películas activas + horarios/formatos
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/movies` | Cartelera semanal (ventana fija de 7 días) |
| `GET` | `/movies/today` | Solo funciones del día actual |

Query obligatorio: `cityId` (UUID).

Filtros opcionales:

| Param | Efecto |
|---|---|
| `date` | Un día `YYYY-MM-DD` dentro de la ventana (solo `/movies`) |
| `genre` | Nombre de género (parcial, case-insensitive) |
| `classification` | Exacta (`12+`, `T`, …) |
| `language` | Idioma de la función (`ES`, `EN`) |
| `roomType` | `STANDARD` \| `VIP` \| `IMAX` |
| `format` | `2D` \| `3D` \| `IMAX` \| `VIP` |
| `cinemaId` | UUID del complejo |
| `available` | `true` → oculta funciones agotadas (RN-011) |
| `audioType` | `SUBTITLED` \| `DUBBED` |

Swagger: http://localhost:3000/api/docs → tag **Movies**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-010** | Solo funciones `isActive = true` (y película/cine activos) |
| **RN-011** | Con `available=true`, `soldSeats < room.capacity` |
| **RN-012** | Ventana siempre de 7 días (`from` … `to` en la respuesta) |
| **RN-013** | Sin caché: cada request lee funciones actuales de Postgres |

Si `movies` viene vacío, el frontend muestra el mensaje informativo (RN-007 de HU-002).

## Modelo incremental

```text
Genre ←→ Movie → Showtime → Room → Cinema → City
```

- `soldSeats` + `Room.capacity` = proxy de “agotada” hasta el mapa de sillas (HU-010).
- Detalle de película / trailers / precios por formato → HU-004.

## Archivos clave

```text
backend/src/movies/
  entities/     → Movie, Genre, Room, Showtime
  enums/        → formato, audio, tipo de sala
  dto/          → query + tipos de respuesta
  movies.service.ts
  movies.controller.ts
  movies.seed.ts   → demo Medellín/Bogotá + función agotada
  movies.module.ts
```

## Cómo probar con Docker

```bash
docker compose up --build

# 1) Obtener cityId de Medellín (vía HU-002)
CITY=$(curl -s http://localhost:3000/api/v1/countries | jq -r '.[0].id')
DEPT=$(curl -s http://localhost:3000/api/v1/departments/$CITY | jq -r '.[] | select(.name=="Antioquia") | .id')
MED=$(curl -s http://localhost:3000/api/v1/cities/$DEPT | jq -r '.[] | select(.name=="Medellín") | .id')

# 2) Cartelera semanal
curl "http://localhost:3000/api/v1/movies?cityId=$MED" | jq

# 3) Solo hoy + disponibles (sin agotadas)
curl "http://localhost:3000/api/v1/movies/today?cityId=$MED&available=true" | jq

# 4) Filtro por formato IMAX
curl "http://localhost:3000/api/v1/movies?cityId=$MED&format=IMAX" | jq
```

## Modelo mental

```text
Controller  → valida query (BillboardQueryDto)
Service     → ventana 7 días + filtros + agrupa por película
Repository  → QueryBuilder sobre showtimes
PostgreSQL  → movies / genres / rooms / showtimes
```
