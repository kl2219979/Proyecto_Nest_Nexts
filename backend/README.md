# Multicine API (NestJS)

API REST de la **Plataforma Web Multicine**: cartelera, cuenta/membresía, compra de sillas y confitería, pagos, entradas/QR, admin, promociones, fidelización, IA e integraciones externas.

> Visión y estado de HUs: [`docs/BACKEND_VISION.md`](../docs/BACKEND_VISION.md)  
> Backlog: [`recursos/PRODUCT_BACKLOG_ORDENADO.md`](../recursos/PRODUCT_BACKLOG_ORDENADO.md)

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | NestJS 11 + TypeScript |
| ORM / DB | TypeORM + PostgreSQL |
| Auth | JWT (usuario) · API Key / OAuth client_credentials (terceros) |
| Docs | Swagger/OpenAPI en `/api/docs` |
| Infra local | Docker Compose (`api` + `db`) |

## Prefijos

| Prefijo | Uso |
|---|---|
| `/api/v1` | API first-party (web / app Multicine) |
| `/api/v1/public` | Facade para apps externas (HU-029) |
| `/api/admin` | Backoffice RBAC (HU-020) |
| `/api/docs` | Swagger UI |

Health: `GET /api/v1/health`

## Arranque rápido

Desde la **raíz del monorepo**:

```bash
cp .env.example .env
docker compose up --build
```

API: http://localhost:3000/api/v1 · Swagger: http://localhost:3000/api/docs

### Desarrollo local (sin Compose para la API)

```bash
# Postgres debe estar disponible (Compose solo db, o local)
cd backend
npm install
npm run start:dev
```

Scripts útiles:

```bash
npm run build        # compilar
npm run start:dev    # watch
npm run start:prod   # dist/
npm run test         # unitarios
npm run test:e2e     # e2e
npm run lint         # ESLint
```

Variables de entorno: plantilla en [`.env.example`](../.env.example). Guía: [`docs/config/`](../docs/config/README.md).

## Módulos (HU-001 … HU-029)

Todas las historias del backlog Sprint 1–5 están implementadas.

| Dominio | Carpeta `src/` | Notas |
|---|---|---|
| Health / infra | `health/`, `config/` | HU-001 |
| Ubicación | `locations/` | países → cines |
| Cartelera | `movies/` | semanal, detalle, estrenos, funciones |
| Auth / perfil | `auth/`, `profile/` | registro, JWT, refresh |
| Membresía / puntos | `membership/`, `loyalty/` | QR socio, niveles |
| Sillas / carrito | `seats/`, `cart/` | locks 10 min |
| Confitería | `snacks/` | catálogo + carrito |
| Pagos / órdenes | `payments/`, `reschedule/` | webhook HMAC, cambio de función |
| Tickets / factura | `tickets/`, `transfer/` | PDF/QR, cesión, validación puerta |
| Notificaciones | `notifications/` | email + prefs + cron |
| Admin | `admin/` | `/api/admin/*` |
| Promos / Cine Flash | `promotions/`, `cineflash/` | cupones + flash automático |
| Giftcards | `giftcards/` | compra / redeem |
| IA / recomendaciones | `ai/`, `recommendations/` | chatbot + feed personalizado |
| Analytics | `analytics/` | dashboard KPIs |
| Encuestas / PQRS | `surveys/`, `pqrs/` | post-visita + casos |
| **API pública** | `public-api/` | API Key, OAuth, scopes, rate limit |

## API pública (HU-029)

Consumidores externos (móvil, kiosco, partner):

1. Credencial: header `X-API-Key` **o** `POST /api/v1/oauth/token` (`client_credentials`)
2. Catálogo y operaciones bajo `/api/v1/public/*` con scopes
3. Admin de clientes: `/api/admin/api-clients`

Seed demo:

| Campo | Valor |
|---|---|
| `clientId` | `mcc_demo_kiosk` |
| `clientSecret` | `mcs_demo_secret_change_me` |
| `apiKey` | `mck_demo_public_api_key_change_me` |

```bash
curl -s -H "X-API-Key: mck_demo_public_api_key_change_me" \
  "http://localhost:3000/api/v1/public/countries"
```

Guía: [`docs/features/hu-029-public-api.md`](../docs/features/hu-029-public-api.md)

## Documentación por historia

Guías en [`docs/features/`](../docs/features/) (`hu-002-locations.md` … `hu-029-public-api.md`).

Tooling / Docker / env: [`docs/config/README.md`](../docs/config/README.md)

## Convenciones

- Prefijo versionado `/api/v1` (RN-113)
- Controller → Service → Repository (TypeORM)
- JSDoc educativo en clases y métodos públicos
- Secretos solo por `.env` (no commitear)
- Alcance acotado al backlog; no inventar endpoints fuera de `BACKEND_VISION`

## Licencia

Código del proyecto Multicine: uso académico / del repositorio del curso.  
NestJS framework: [MIT](https://github.com/nestjs/nest/blob/master/LICENSE).
