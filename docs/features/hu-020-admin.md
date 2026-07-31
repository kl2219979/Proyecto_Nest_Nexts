# HU-020 — Panel Administrativo del Multicine (Backend)

## Qué resuelve

Backoffice bajo `/api/admin/*` con JWT + RBAC (RN-088) y auditoría (RN-087 / RN-090):

```text
Login (role en JWT) → RolesGuard
  → CRUD catálogos (geo, cines, salas, sillas, películas, funciones, snacks)
  → Usuarios / roles / bloqueos
  → Lectura de ventas (órdenes, pagos, facturas)
  → Reportes + CSV
  → admin_audit_logs
```

## Prefijos

| Ámbito | Prefijo |
|---|---|
| API pública | `/api/v1` |
| Backoffice | `/api/admin` |

Swagger: http://localhost:3000/api/docs → tags **Admin · \***

## Roles (RN-088)

| Rol | Alcance |
|---|---|
| `CUSTOMER` | Portal (default al registrarse) |
| `STAFF` | Escaneo QR (`POST /api/v1/tickets/validate`) |
| `ADMIN` | CRUD backoffice + reportes |
| `SUPER_ADMIN` | Todo + otorgar `SUPER_ADMIN` |

Jerarquía: `SUPER_ADMIN > ADMIN > STAFF > CUSTOMER` (`@Roles(mínimo)`).

## Seed demo

Tras arrancar (si existe ciudad Medellín del seed geo):

| Email | Password | Rol |
|---|---|---|
| `admin@multicine.local` | `Admin123!` | `SUPER_ADMIN` |
| `staff@multicine.local` | `Staff123!` | `STAFF` |

## Endpoints principales

### Geo / venues
- `GET/POST/PUT/DELETE /api/admin/countries|departments|cities`
- `GET/POST/PUT/DELETE /api/admin/cinemas|rooms`
- `GET/POST /api/admin/rooms/:roomId/seats` · `PUT/DELETE /api/admin/seats/:id`

### Contenido
- `GET/POST/PUT/DELETE /api/admin/movies`
- `POST /api/admin/movies/:id/publish|unpublish|promote`
- `GET/POST/PUT/DELETE /api/admin/showtimes` · `POST …/cancel`
- `GET/POST/PUT/DELETE /api/admin/snacks`

### Usuarios / ventas / reportes
- `GET /api/admin/roles`
- `GET/POST/PUT /api/admin/users`
- `GET /api/admin/orders|payments|invoices`
- `GET /api/admin/reports/daily-sales` (+ `.csv`)
- `GET /api/admin/reports/occupation|top-movies|top-snacks|memberships|payments-summary`
- `GET /api/admin/audit-logs`

## Modelo incremental

```text
User.role                 CUSTOMER|STAFF|ADMIN|SUPER_ADMIN
JwtPayload.role           claim RBAC
admin_audit_logs          RN-087 / RN-090
```

## Fuera de alcance (HUs posteriores)

| Tema | HU |
|---|---|
| Promociones / cupones formales | **HU-026** (hecho) |
| Cine Flash automático | HU-019 |
| Dashboard KPI gerencial profundo | HU-025 |
| Reembolsos / combos / festivos | no en visión HU-020 |

## Cómo probar

```bash
# Login admin
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@multicine.local","password":"Admin123!"}'

# Listar países (Bearer del admin)
curl http://localhost:3000/api/admin/countries \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Escaneo puerta (STAFF)
curl -X POST http://localhost:3000/api/v1/tickets/validate \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"qrPayload":"MCQR-…"}'
```
