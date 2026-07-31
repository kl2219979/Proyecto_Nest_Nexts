# HU-027 — Encuestas de Satisfacción (Backend)

## Qué resuelve

Permite al cliente **calificar su experiencia** después de asistir a una
función, ligado a la compra (`orderId`).

```text
Escaneo puerta (HU-024) → ticket USED
  → POST /surveys { orderId, ratings… }
  → 1 encuesta por compra (RN-109)

GET /surveys · GET /surveys/:id  → consultar mis respuestas
```

## Endpoints

Prefijo global: `/api/v1` · Auth: **JWT**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/surveys` | Crear encuesta (201) |
| `GET` | `/surveys` | Listar mis encuestas |
| `GET` | `/surveys/:id` | Consultar una encuesta propia |

Swagger: http://localhost:3000/api/docs → tag **Surveys**

### Body `POST /surveys`

| Campo | Rango | Notas |
|---|---|---|
| `orderId` | UUID | Compra PAID asistida |
| `movieRating` | 1–5 | Película |
| `roomRating` | 1–5 | Sala |
| `soundRating` | 1–5 | Sonido |
| `imageRating` | 1–5 | Imagen |
| `comfortRating` | 1–5 | Comodidad |
| `snacksRating` | 1–5 | Confitería |
| `cleanlinessRating` | 1–5 | Limpieza |
| `serviceRating` | 1–5 | Servicio |
| `recommendScore` | 0–10 | Probabilidad de recomendar (NPS) |
| `comments` | opcional | Máx. 1000 caracteres |

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-108** | Solo usuarios con ≥1 ticket `USED` de esa orden (asistieron) |
| **RN-109** | Una encuesta por compra (`UNIQUE orderId`; 409 si se repite) |

Códigos de error útiles: `SURVEY_ATTENDANCE_REQUIRED`, `SURVEY_ALREADY_EXISTS`,
`ORDER_NOT_FOUND`, `ORDER_NOT_PAID`.

## Modelo incremental

```text
Survey
  userId → User
  orderId → Order (unique)
  ratings 1–5 + recommendScore 0–10 + comments?
```

Asistencia se infiere de `tickets.status = USED` (HU-024), sin tabla nueva.

## Cómo probar

```bash
# Tras pagar y escanear al menos un QR de la orden:
curl -X POST http://localhost:3000/api/v1/surveys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId":"'"$ORDER_ID"'",
    "movieRating":5,"roomRating":4,"soundRating":5,"imageRating":5,
    "comfortRating":4,"snacksRating":3,"cleanlinessRating":4,"serviceRating":5,
    "recommendScore":9,
    "comments":"Excelente experiencia"
  }'

curl http://localhost:3000/api/v1/surveys \
  -H "Authorization: Bearer $TOKEN"
```

## Fuera de alcance

- PQRS → **HU-028**
- API pública / agregados gerenciales de NPS → **HU-029** / extensiones futuras
