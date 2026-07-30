# HU-005 — Próximos estrenos (Backend)

## Qué resuelve

El visitante consulta la sección **Próximamente**: películas confirmadas que aún no están en cartelera, con fecha de estreno (por ciudad), tráiler y opción de avisarme.

```text
cityId → películas status=UPCOMING → orden por releaseDate
userId + movieId → solicitud de aviso (sin duplicados)
status → NOW_SHOWING → disparo de avisos pendientes (RN-020)
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/movies/upcoming` | Listado de próximos estrenos por ciudad |
| `GET` | `/movies/:id` | Detalle (también para UPCOMING; sin funciones aún) |
| `POST` | `/notifications/upcoming` | “Notificarme cuando esté disponible” |

Query de listado: `cityId` (UUID) obligatorio.

Swagger: http://localhost:3000/api/docs → tags **Movies** y **Notifications**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-017** | Solo películas con `status = UPCOMING` |
| **RN-018** | Fecha de estreno por ciudad (y opcionalmente por complejo) vía `movie_city_releases` |
| **RN-019** | Unicidad `(userId, movieId)` → 409 Conflict si se repite |
| **RN-020** | Al pasar a `NOW_SHOWING`, las solicitudes `PENDING` se marcan `SENT` |

El **correo real** es HU-015; aquí se registra la intención y se deja traza en log al disparar.

## Auth provisional

Hasta HU-006/007 no hay JWT. `POST /notifications/upcoming` recibe en el body:

```json
{
  "userId": "<uuid>",
  "email": "usuario@ejemplo.com",
  "movieId": "<uuid>",
  "cityId": "<uuid>"
}
```

## Modelo incremental

```text
Movie.status ∈ { UPCOMING, NOW_SHOWING }
MovieCityRelease(movie, city, cinema?, releaseDate)
UpcomingNotification(userId, email, movie, city, status)
```

## Disparo RN-020

`MoviesService.promoteToNowShowing(movieId)` (uso interno / futuro admin HU-020):

1. `status = NOW_SHOWING`
2. `NotificationsService.dispatchUpcomingForMovie(movieId)`

## Archivos clave

```text
backend/src/movies/
  entities/movie-city-release.entity.ts
  enums/movie.enums.ts          (+ MovieStatus)
  dto/upcoming-*.ts
  movies.service.ts             → getUpcoming / promoteToNowShowing
  movies.seed.ts                → Nocturna / Risa Contagiosa

backend/src/notifications/
  entities/upcoming-notification.entity.ts
  dto/subscribe-upcoming.dto.ts
  notifications.service.ts
  notifications.controller.ts
```

## Cómo probar

```bash
docker compose down -v && docker compose up --build

# cityId Medellín (misma cadena HU-002)
COUNTRY=$(curl -s http://localhost:3000/api/v1/countries | jq -r '.[0].id')
DEPT=$(curl -s http://localhost:3000/api/v1/departments/$COUNTRY | jq -r '.[] | select(.name=="Antioquia") | .id')
MED=$(curl -s http://localhost:3000/api/v1/cities/$DEPT | jq -r '.[] | select(.name=="Medellín") | .id')

curl "http://localhost:3000/api/v1/movies/upcoming?cityId=$MED" | jq
MOVIE=$(curl -s "http://localhost:3000/api/v1/movies/upcoming?cityId=$MED" | jq -r '.movies[0].id')

curl -X POST http://localhost:3000/api/v1/notifications/upcoming \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"00000000-0000-4000-8000-000000000099\",\"email\":\"demo@multicine.local\",\"movieId\":\"$MOVIE\",\"cityId\":\"$MED\"}"
```

## Fuera de alcance

- JWT / cuenta real (HU-006/007)
- Motor de email HTML (HU-015)
- Endpoint admin público para promover a cartelera (HU-020)
- Embed YouTube (frontend)
