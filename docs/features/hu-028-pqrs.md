# HU-028 — PQRS Integrado (Backend)

## Qué resuelve

Permite al cliente **registrar y hacer seguimiento** de Peticiones, Quejas,
Reclamos, Sugerencias y Felicitaciones; el personal asigna y gestiona estados.

```text
POST /pqrs  →  PQRS-YYYY-NNNNNN (RN-110) + SLA (RN-111) + email (RN-112)
GET  /pqrs  · GET /pqrs/:id  → seguimiento / historial
PUT  /pqrs/:id  → comentarios, adjuntos, estado, asignación interna
GET/PUT /pqrs/sla  → plazos configurables por categoría
```

## Endpoints

Prefijo global: `/api/v1` · Auth: **JWT**

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| `POST` | `/pqrs` | Cliente | Alta de caso (201) |
| `GET` | `/pqrs` | Cliente / STAFF+ | Listado (propios o todos) |
| `GET` | `/pqrs/:id` | Dueño / STAFF+ | Detalle + historial |
| `PUT` | `/pqrs/:id` | Dueño / STAFF+ | Seguimiento / gestión |
| `GET` | `/pqrs/sla` | JWT | Consultar SLA por categoría |
| `PUT` | `/pqrs/sla` | ADMIN+ | Actualizar horas SLA |

Swagger: http://localhost:3000/api/docs → tag **PQRS**

### Body `POST /pqrs`

| Campo | Notas |
|---|---|
| `category` | `PETITION` · `COMPLAINT` · `CLAIM` · `SUGGESTION` · `COMPLIMENT` |
| `subject` | 3–200 caracteres |
| `description` | 10–4000 caracteres |
| `orderId` | opcional (debe ser del usuario) |
| `cinemaId` | opcional |
| `attachments[]` | opcional · `{ fileName, mimeType, url }` · máx. 5 |

El upload binario es frontend/CDN; el backend solo guarda la URL.

### Body `PUT /pqrs/:id`

| Campo | Cliente | STAFF+ |
|---|---|---|
| `comment` | sí | sí |
| `attachments` | sí | sí |
| `status` | no | sí |
| `assignedToUserId` | no | sí (`null` desasigna) |
| `commentInternal` | no | sí (notas internas) |

Estados: `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED` · también `CANCELLED`.

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-110** | Consecutivo `PQRS-YYYY-NNNNNN` (contador anual con lock) |
| **RN-111** | SLA por categoría (seed + `PUT /pqrs/sla`); snapshot en el caso |
| **RN-112** | Email al crear, actualizar (estado/comentario público) y resolver |

SLA por defecto (horas): Petición 72 · Queja/Reclamo 48 · Sugerencia 120 · Felicitación 168.

## Modelo incremental

```text
PqrsCase (ticketNumber, category, status, assignedTo, slaHours/slaDueAt)
  ├── PqrsComment (isInternal?)
  ├── PqrsAttachment (url CDN)
  ├── PqrsHistory (CREATED / STATUS / ASSIGNED / COMMENT / ATTACHMENT)
PqrsSlaConfig (category → hours)
PqrsCounter (year → lastNumber)
```

## Cómo probar

```bash
# Alta
curl -X POST http://localhost:3000/api/v1/pqrs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category":"COMPLAINT",
    "subject":"Silla rota en VIP",
    "description":"La silla F12 no reclinaba en la función de anoche.",
    "attachments":[{
      "fileName":"foto.jpg","mimeType":"image/jpeg",
      "url":"https://cdn.example.com/pqrs/foto.jpg"
    }]
  }'

# Seguimiento
curl http://localhost:3000/api/v1/pqrs/$PQRS_ID \
  -H "Authorization: Bearer $TOKEN"

# Staff: asignar + resolver
curl -X PUT http://localhost:3000/api/v1/pqrs/$PQRS_ID \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedToUserId":"'"$STAFF_ID"'",
    "status":"RESOLVED",
    "comment":"Reparamos la silla y ofrecimos snack de cortesía."
  }'

# ADMIN: ajustar SLA
curl -X PUT http://localhost:3000/api/v1/pqrs/sla \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"CLAIM","hours":24}'
```

## Fuera de alcance

- API pública para terceros → **HU-029**
- Upload binario multipart en el API (queda en CDN/frontend)
