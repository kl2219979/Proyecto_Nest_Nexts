# HU-008 — Consulta de Perfil y Beneficios de Membresía (Backend)

## Qué resuelve

El usuario autenticado consulta y actualiza su cuenta desde “Mi Cuenta”:

```text
Access JWT
  → GET /profile          (datos personales + preferencias)
  → PUT /profile          (actualizar; RN-034 si cambia email)
  → GET /membership       (nivel, beneficios RN-032, QR RN-033, billetera)
```

Historial de compras / puntos / reservas activas se exponen vacíos hasta
HU-014, HU-023 y el flujo de carrito.

## Endpoints

Prefijo global: `/api/v1` · todos requieren `Authorization: Bearer <access>`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/profile` | Perfil + preferencias de notificación |
| `PUT` | `/profile` | Actualiza campos enviados |
| `GET` | `/membership` | Membresía, beneficios, QR, wallet, historiales |

Swagger: http://localhost:3000/api/docs → tags **Profile** y **Membership**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-032** | Descuentos según `MembershipLevel` (`benefitsForLevel`) |
| **RN-033** | `qr.payload` = código de membresía; único e intransferible |
| **RN-034** | Cambio de email → `isEmailVerified/isActive = false` + token de activación; reactivar con `POST /auth/activate` |

## Modelo incremental

```text
UserProfile += photoUrl (nullable)
Membership  → benefits (calculados) + qr.payload = code
Wallet      → balance (consulta)
purchaseHistory / pointsHistory / activeReservations → [] (stubs)
```

## Cómo probar

```bash
# Tras login (HU-007), usar el accessToken:

curl http://localhost:3000/api/v1/profile \
  -H "Authorization: Bearer <access>"

curl -X PUT http://localhost:3000/api/v1/profile \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Anita","notificationPreferences":{"emailMarketing":true}}'

curl http://localhost:3000/api/v1/membership \
  -H "Authorization: Bearer <access>"

# Cambio de email (luego activar con el token del log):
curl -X PUT http://localhost:3000/api/v1/profile \
  -H "Authorization: Bearer <access>" \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana.nueva@example.com","emailConfirm":"ana.nueva@example.com"}'
```

## Archivos clave

- `backend/src/profile/` — módulo GET/PUT perfil
- `backend/src/membership/membership.controller.ts` — `GET /membership`
- `backend/src/membership/membership-benefits.ts` — tabla RN-032 (también login)
