# HU-023 — Programa de Fidelización y Acumulación de Puntos (Backend)

## Qué resuelve

Permite **acumular puntos** por cada compra pagada, **redimirlos** en
carrito (entradas/confitería) o billetera (bonos), y **subir de nivel**
automáticamente (Bronce → Plata → Oro → Platino).

```text
Pago APPROVED
  → consume puntos del carrito (si apply-points)
  → earnForOrder (valor neto × multiplicador de nivel)
  → recalcula nivel (RN-101)

GET  /points                 → saldo + historial + progreso
POST /points                 → redimir a Wallet (bonos)
POST /cart/apply-points      → descuento en checkout
GET  /membership/levels      → catálogo de niveles
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/points` | JWT | Saldo, lifetime, nivel, historial |
| `POST` | `/points` | JWT | Redimir a billetera (`destination=WALLET`) |
| `POST` | `/cart/apply-points` | JWT | Aplicar puntos al total del carrito |
| `GET` | `/membership/levels` | — | Umbrales, multiplicadores y beneficios |

Swagger: http://localhost:3000/api/docs → tag **Loyalty** / **Membership**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-099** | Lotes EARN vencen a los 12 meses (FIFO; se aplica al consultar) |
| **RN-100** | Promo con `incompatibleWithPoints=true` no acumula ni admite puntos |
| **RN-101** | Nivel automático según puntos de por vida (solo sube) |

## Fórmula educativa

| Concepto | Valor |
|---|---|
| Base | 1 punto por cada $1.000 COP de (subtotal − membresía − promo) |
| Multiplicador | Bronce 1× · Plata 1.25× · Oro 1.5× · Platino 2× |
| Redención | 1 punto = $10 COP |
| Umbrales lifetime | Plata 500 · Oro 2.000 · Platino 5.000 |

## Modelo incremental

```text
PointLedgerEntry (EARN | REDEEM_CART | REDEEM_WALLET | EXPIRE)
Cart.pointsRedeemed / pointsDiscountAmount
Order.pointsRedeemed / pointsDiscountAmount / pointsEarned
Promotion.incompatibleWithPoints (RN-100)
Membership.level (actualizado por LoyaltyService)
```

## Cómo probar

```bash
# Catálogo de niveles
curl http://localhost:3000/api/v1/membership/levels

# Tras un pago APPROVED:
curl http://localhost:3000/api/v1/points \
  -H "Authorization: Bearer $TOKEN"

# Aplicar al carrito
curl -X POST http://localhost:3000/api/v1/cart/apply-points \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points":50}'

# Redimir a billetera
curl -X POST http://localhost:3000/api/v1/points \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points":100,"destination":"WALLET"}'
```

## Fuera de alcance

- Cine Flash → **HU-019**
- Chat IA → **HU-021**
