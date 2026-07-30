# HU-004 — Detalle de película (Backend)

## Qué resuelve

Desde una tarjeta de cartelera (HU-003), el visitante abre la **ficha completa** de una película en su ciudad: sinopsis, elenco, tráiler, precios por formato y funciones futuras.

```text
movieId + cityId → ficha + funciones futuras (RN-014) + similares por género
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/movies/:id` | Detalle completo filtrado por ciudad |
| `GET` | `/movies/:id/recommendations` | Películas similares (género compartido) |

Query obligatorio: `cityId` (UUID).

Swagger: http://localhost:3000/api/docs → tag **Movies**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-014** | Solo funciones con `startsAt > now` (futuras) |
| **RN-015** | Cada función trae `isSoldOut` para marcar visualmente en UI |
| **RN-016** | Backend expone `trailerUrl` (YouTube); el embed es del frontend |

Las funciones siguen filtradas por ciudad (criterio de aceptación).

## Campos nuevos en el modelo

| Entidad | Campos |
|---|---|
| `Movie` | `bannerUrl`, `trailerUrl`, `synopsis`, `releaseDate` |
| `CastMember` | `name`, `role`, `sortOrder`, `movieId` |
| `Showtime` | `price` (valor de entrada; agregado en `pricesByFormat`) |

## Respuesta de detalle (resumen)

- Ficha: póster, banner, tráiler, sinopsis, director, elenco, géneros, duración, clasificación, estreno, rating
- `formats` / `languages` derivados de funciones futuras de la ciudad
- `pricesByFormat`: precio mínimo por formato
- `showtimes`: horarios futuros con `isSoldOut` y `price`

## Archivos clave

```text
backend/src/movies/
  entities/cast-member.entity.ts
  entities/movie.entity.ts      (+ campos HU-004)
  entities/showtime.entity.ts   (+ price)
  dto/movie-detail-*.ts
  movies.service.ts             → getMovieDetail / getRecommendations
  movies.controller.ts
  movies.seed.ts
```

## Cómo probar

```bash
docker compose up --build
# Si ya tenías volumen con seed HU-003 sin ficha:
# docker compose down -v && docker compose up --build

# cityId de Medellín (vía HU-002) + movieId desde cartelera
curl "http://localhost:3000/api/v1/movies?cityId=$MED" | jq '.movies[0].id'
curl "http://localhost:3000/api/v1/movies/$MOVIE_ID?cityId=$MED" | jq
curl "http://localhost:3000/api/v1/movies/$MOVIE_ID/recommendations?cityId=$MED" | jq
```

## Fuera de alcance

- Embed YouTube en backend (RN-016 → frontend)
- Inicio de compra / locks de sillas (HU-010)
- Próximos estrenos / notificaciones (HU-005)
