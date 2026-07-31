# HU-022 — Motor de Recomendaciones Personalizadas

## Qué resuelve

Feed personalizado para el usuario autenticado, basado en
**historial de compras autorizado**, preferencias explícitas y
cartelera real de la ciudad:

```text
POST /recommendations/preferences
  → consentimiento (RN-097) + gustos + ventana RN-098
  → invalida snapshots del día

GET /recommendations?cityId=
  → snapshot fresco del día (RN-096) o recálculo
  → señales: géneros, formatos, idiomas, complejos, días/horas
  → excluye películas vistas recientemente (RN-098)
  → ranking con reasons + próxima función sugerida

Cron 01:00
  → regenera feeds existentes (RN-096)
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/recommendations?cityId=` | JWT | Feed personalizado |
| `POST` | `/recommendations/preferences` | JWT | Upsert de preferencias |

Swagger: tag **Recommendations**.

### Body `POST /recommendations/preferences` (parcial)

```json
{
  "allowPurchaseHistory": true,
  "allowProfileSignals": true,
  "recentlyViewedDays": 30,
  "favoriteGenres": ["Acción"],
  "preferredFormats": ["IMAX"],
  "preferredLanguages": ["ES"],
  "preferredCinemaIds": ["uuid-cine"],
  "preferredWeekdays": [5],
  "preferredHourFrom": 18,
  "preferredHourTo": 22
}
```

## Reglas

| RN | Comportamiento |
|---|---|
| **RN-096** | Snapshot válido el mismo día UTC; cron diario a la 01:00 |
| **RN-097** | Sin `allowPurchaseHistory` no se lee historial; sin `allowProfileSignals` no se usa cine favorito |
| **RN-098** | No recomienda películas compradas en los últimos `recentlyViewedDays` (configurable; default env `RECOMMENDATIONS_RECENTLY_VIEWED_DAYS=30`) |

## Señales analizadas

| Señal | Fuente |
|---|---|
| Géneros favoritos | Órdenes PAID → `Movie.genres` + prefs explícitas |
| Horarios frecuentes | `OrderTicketItem.startsAt` (día / hora) |
| Complejos preferidos | `Order.cinemaId` + perfil / prefs |
| Idiomas / formatos | Líneas de orden + prefs |
| Frecuencia de visitas | Conteo de órdenes PAID |

## Modelo

```text
recommendation_preferences  (userId unique, flags RN-097/098, listas jsonb)
recommendation_feeds        (userId+cityId unique, items/signals jsonb, computedAt)
```

## Cómo probar

1. Login JWT y obtén un `cityId` de seed.
2. `POST /api/v1/recommendations/preferences` con géneros/formatos.
3. `GET /api/v1/recommendations?cityId=$CITY` → `fromCache=false`, ranking con `reasons`.
4. Repite el GET el mismo día → `fromCache=true`.
5. Con historial PAID reciente, verifica que esas películas no aparezcan (RN-098).
6. `allowPurchaseHistory=false` → el feed ignora órdenes.

## Fuera de alcance

| Tema | HU |
|---|---|
| Chatbot conversacional | HU-021 |
| Similares por ficha de película | HU-004 |
| UI del feed | Frontend |
| Modelo ML externo | Scoring rule-based educativo |
