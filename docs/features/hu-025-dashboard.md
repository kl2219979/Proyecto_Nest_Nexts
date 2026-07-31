# HU-025 — Dashboard Gerencial de Indicadores (KPIs)

## Qué resuelve

Tablero ejecutivo con agregados en tiempo real para la gerencia:

```text
GET /dashboard?period=monthly&cityId=&cinemaId=
  → KPIs (ventas, entradas, ocupación, snacks, Cine Flash, bonos,
         membresías, usuarios activos, conversión, cancelaciones,
         transferencias, ingresos)
  → serie temporal (gráficos)
  → tops (películas / ciudades / complejos / snacks)
  → comparativo vs. período anterior

GET /dashboard/export.pdf
GET /dashboard/export.xlsx   (CSV UTF-8 BOM abrible en Excel)
```

Los reportes operativos del panel (`/api/admin/reports/*`, HU-020) siguen
disponibles; este módulo es el **dashboard gerencial** consolidado.

## Endpoints

Prefijo global: `/api/v1` · Auth: JWT + rol **ADMIN+**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/dashboard` | JSON completo de KPIs |
| `GET` | `/dashboard/export.pdf` | PDF ejecutivo |
| `GET` | `/dashboard/export.xlsx` | CSV compatible Excel |

Swagger: tag **Dashboard**.

### Query params

| Param | Default | Notas |
|---|---|---|
| `period` | `monthly` | `daily` \| `weekly` \| `monthly` \| `yearly` |
| `from` / `to` | — | `YYYY-MM-DD`; anulan el rango del `period` |
| `cityId` | — | Recorta a cines de esa ciudad |
| `cinemaId` | — | Recorta a un complejo |
| `limit` | `10` | Tamaño de rankings (1–50) |

### Períodos por defecto (UTC)

| period | Rango |
|---|---|
| `daily` | Desde 00:00 UTC del día actual |
| `weekly` | Últimos 7 días |
| `monthly` | Desde el día 1 del mes |
| `yearly` | Desde el 1 de enero |

El **comparativo** usa una ventana previa de la misma duración.

## Indicadores

| Bloque | Fuente principal |
|---|---|
| Ventas / ingresos | `orders` PAID (`total`, subtotales) |
| Entradas | `tickets` (VALID/USED/CANCELLED) |
| Ocupación | `showtimes` + `rooms.capacity` (`startsAt` en rango) |
| Confitería | `order_snack_items` en órdenes PAID |
| Cine Flash | `cineflash_audits` + promos `CINE_FLASH` activas |
| Bonos | `giftcards` (vendidos / redimidos) |
| Membresías | `memberships` por nivel + altas en período |
| Usuarios activos | altas + verificados + logins exitosos distintos |
| Conversión | PAID / (PAID+FAILED+CANCELLED) |
| Cancelaciones | órdenes CANCELLED + tickets CANCELLED |
| Transferencias | `ticket_transfers` |
| Tops | películas, ciudades, complejos, snacks |

## Modelo

Sin tablas nuevas: solo lecturas agregadas sobre el esquema existente
(`analytics` como módulo Nest, no entidad).

## Cómo probar

```bash
# Login admin (seed HU-020)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@multicine.local","password":"Admin123!"}' \
  | jq -r .accessToken)

# Dashboard mensual
curl -s "http://localhost:3000/api/v1/dashboard?period=monthly" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Export PDF
curl -s "http://localhost:3000/api/v1/dashboard/export.pdf?period=weekly" \
  -H "Authorization: Bearer $TOKEN" -o dashboard.pdf

# Export Excel/CSV
curl -s "http://localhost:3000/api/v1/dashboard/export.xlsx?period=monthly" \
  -H "Authorization: Bearer $TOKEN" -o dashboard.csv
```

## Fuera de alcance

| Tema | HU |
|---|---|
| UI de gráficos | Frontend |
| Reportes CRUD admin | HU-020 |
| Encuestas / PQRS | HU-027 / HU-028 |
| API pública terceros | HU-029 |
| Warehouse / ETL batch | No en backlog |
