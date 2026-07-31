# HU-029 — API Pública para Aplicaciones Externas

## Qué resuelve

Permite a **apps móviles, kioscos y partners** autenticarse como consumidor
externo (API Key u OAuth 2.0 client_credentials), con **scopes**, **rate limit
por cliente** y **auditoría** de cada request.

```text
POST /oauth/token          → access_token (client_credentials)
X-API-Key: mck_…           → alternativa al OAuth
GET  /public/movies …      → catálogo (scope catalog:read)
POST /public/auth/login    → login usuario (scope auth:write)
GET  /public/profile       → X-API-Key + JWT usuario
Admin: /api/admin/api-clients
```

Las rutas first-party (`/api/v1/movies`, `/auth/login`, …) **no cambian**:
la facade `/public` es el contrato para terceros (RN-113…118).

## Autenticación del consumidor

| Mecanismo | Cómo |
|---|---|
| **API Key** | Header `X-API-Key: mck_…` |
| **OAuth 2.0** | `POST /api/v1/oauth/token` con `grant_type=client_credentials` → Bearer 1 h |
| Dual (app + usuario) | `X-API-Key` (o `X-Client-Token`) **+** `Authorization: Bearer` (JWT usuario) |

## Scopes

| Scope | Uso |
|---|---|
| `catalog:read` | Geo, cines, salas, cartelera, funciones, promos, Cine Flash |
| `auth:write` | Registro / login de usuario final |
| `users:read` | Perfil y membresía (requiere JWT usuario) |
| `orders:read` | Órdenes del usuario (requiere JWT) |
| `giftcards:read` | Consulta/validación de bono por código |

## Rate limiting (RN-114 / RN-116)

- Throttler global Nest (100/min) sigue activo.
- Además, cada `ApiClient` tiene `rateLimitPerMinute` (ventana 60 s en memoria).
- Exceso → HTTP **429**.

## Auditoría (RN-117)

Tabla `public_api_audit_logs`. Consulta admin:

`GET /api/admin/api-clients/audit-logs`

## Endpoints facade (`/api/v1/public`)

| Método | Ruta | Scope |
|---|---|---|
| GET | `/public/countries` … `/cities/:id` | `catalog:read` |
| GET | `/public/cinemas` · `/public/rooms?cinemaId=` | `catalog:read` |
| GET | `/public/movies` · `/today` · `/upcoming` · `/cineflash` · `/:id` · `/:id/functions` | `catalog:read` |
| GET | `/public/functions?movieId=&cityId=` · `/functions/:id/prices` | `catalog:read` |
| GET | `/public/promotions` | `catalog:read` |
| POST | `/public/auth/register` · `/public/auth/login` | `auth:write` |
| GET | `/public/profile` · `/public/membership` | `users:read` + JWT |
| GET | `/public/orders` · `/public/orders/:id` | `orders:read` + JWT |
| GET | `/public/giftcards/:code` | `giftcards:read` |

También: `GET /api/v1/orders/:id` (first-party, JWT) añadido para el contrato base.

## Admin de clientes

| Método | Ruta | Rol |
|---|---|---|
| GET/POST | `/api/admin/api-clients` | ADMIN+ |
| GET/PUT/DELETE | `/api/admin/api-clients/:id` | ADMIN+ |
| POST | `/api/admin/api-clients/:id/rotate` | ADMIN+ |
| GET | `/api/admin/api-clients/audit-logs` | ADMIN+ |

Al crear/rotar se muestran `clientSecret` y `apiKey` **una sola vez**.

## Seed demo

| Campo | Valor |
|---|---|
| `clientId` | `mcc_demo_kiosk` |
| `clientSecret` | `mcs_demo_secret_change_me` |
| `apiKey` | `mck_demo_public_api_key_change_me` |
| scopes | todos |
| rate limit | 120/min |

## Cómo probar

```bash
# Catálogo con API Key
curl -s -H "X-API-Key: mck_demo_public_api_key_change_me" \
  "http://localhost:3000/api/v1/public/movies?cityId=<CITY_UUID>"

# OAuth client_credentials
curl -s -X POST http://localhost:3000/api/v1/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"mcc_demo_kiosk","client_secret":"mcs_demo_secret_change_me"}'

# Login usuario vía API pública
curl -s -X POST http://localhost:3000/api/v1/public/auth/login \
  -H "X-API-Key: mck_demo_public_api_key_change_me" \
  -H "Content-Type: application/json" \
  -d '{"email":"…","password":"…"}'
```

Swagger: http://localhost:3000/api/docs → tags **Public API · *** y candado **api-key**.

## Modelo incremental

```text
ApiClient (clientId, secretHash, apiKeyHash, scopes, rateLimitPerMinute)
PublicApiAuditLog (apiClientId, method, path, status, payloadSummary)
```
