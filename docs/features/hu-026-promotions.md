# HU-026 — Administración de Promociones y Cupones (Backend)

## Qué resuelve

CRUD de promociones/cupones con reglas de vigencia, apilabilidad y tope
por usuario; aplicación real en carrito y precios de función:

```text
Admin CRUD (/api/admin/promotions)
  → Catálogo promotions + promotion_redemptions
    → GET /promotions (activas)
    → POST /cart/apply-promo (cupón)
    → GET /functions/:id/prices (promos automáticas RN-038)
    → Webhook PAID → recordRedemptions (RN-107)
```

## Endpoints

| Ámbito | Rutas |
|---|---|
| Público | `GET /api/v1/promotions` |
| ADMIN (JWT) | `POST/PUT/DELETE /api/v1/promotions` |
| Backoffice | `GET/POST/PUT/DELETE /api/admin/promotions` (+ auditoría) |
| Carrito | `POST /api/v1/cart/apply-promo` `{ "code": "MULTICINE10" }` |

Swagger: tags **Promotions** y **Admin · Promotions**.

## Tipos y mecánicas

| `PromotionType` | Uso |
|---|---|
| `TWO_FOR_ONE` | 2x1 entradas |
| `PERCENT_20` / `PERCENT_30` | Plantillas % |
| `COMBO` / `CUSTOM` | Fijo o % configurable |
| `BIRTHDAY` | Valida `birthDate` del perfil |
| `MEMBERSHIP` | Nivel mínimo opcional |
| `SEASON` / `BLACK_FRIDAY` / `CINE_FLASH` | Campañas (Flash auto = HU-019) |

| `DiscountKind` | Cálculo |
|---|---|
| `PERCENT` | % sobre base aplicable |
| `FIXED` | Monto COP (tope = base) |
| `TWO_FOR_ONE` | Regala la más barata por cada par |

## Reglas

| RN | Comportamiento |
|---|---|
| **RN-105** | `stackable`; si alguna es `false` → 409 (alineado RN-048) |
| **RN-106** | `startsAt`…`endsAt` + `isActive` |
| **RN-107** | `maxUsesPerUser` / `maxTotalUses`; se cuenta al pago PAID |
| **RN-038** | Promos `requiresCode=false` en `GET /functions/:id/prices` |

Scopes opcionales: `cityId`, `cinemaId`, `roomId`, `movieId`, `genreId`, `format`.
Flags: `appliesToTickets` / `appliesToSnacks`.

## Seed demo

| Código | Efecto |
|---|---|
| `MULTICINE10` | $10.000 entradas, no apilable |
| `SNACK5K` | $5.000 snacks, apilable |
| `TWO4ONE` | 2x1 entradas |
| `BDAY20` | 20% cumpleaños |
| `BLACK30` | 30% Black Friday |
| _(sin código)_ | 15% automático en precios de función |

## Modelo

```text
promotions
promotion_redemptions   (userId + promotionId + orderId)
```

## Fuera de alcance

| Tema | HU |
|---|---|
| Giftcards | HU-018 |
| Puntos / incompatibilidad con promos | HU-023 |

> Cine Flash automático (activación por ocupación) → **HU-019** (hecho).

## Cómo probar

1. Login `admin@multicine.local` / `Admin123!`
2. `POST /api/admin/promotions` con vigencia y código
3. En carrito: `POST /cart/apply-promo` con el código
4. `GET /functions/:id/prices` → ver promo automática 15%
