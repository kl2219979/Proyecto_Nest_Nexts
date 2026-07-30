# HU-006 — Registro de Usuario y Membresía Digital (Backend)

## Qué resuelve

El visitante crea una cuenta segura. En el mismo flujo el backend genera:

```text
User (inactivo) + Profile + NotificationPreferences
  + Membership (ACTIVE, código único) + Wallet (saldo 0)
  → correo de activación (log hasta HU-015)
  → POST /auth/activate → cuenta habilitada
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` | Alta + membresía automática |
| `POST` | `/auth/activate` | Confirma email con token (24 h) |
| `POST` | `/membership/create` | Crea membresía para un `userId` sin una |

Swagger: http://localhost:3000/api/docs → tags **Auth** y **Membership**

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-021** | Email único → 409 Conflict |
| **RN-022** | Contraseña ≥ 10 caracteres |
| **RN-023** | Mayúscula + minúscula + número + especial |
| **RN-024** | `isActive` / `isEmailVerified` = false hasta activar |
| **RN-025** | Toda alta crea membresía digital |
| **RN-026** | Código único `MC-XXXXXXXX` |

## Seguridad

- Contraseña: hash **BCrypt** (`bcryptjs`, cost 10).
- CAPTCHA: campo `captchaToken`; en dev aceptar `CAPTCHA_DEV_TOKEN` (default `dev-ok`).
- Rate limit: `@nestjs/throttler` — registro 5 req/min.
- Token de activación: 64 hex, TTL 24 h.

El correo real es **HU-015**; aquí se registra el enlace en el log de Nest.

## Body de registro (resumen)

```json
{
  "firstName": "Ana",
  "lastName": "García López",
  "documentType": "CC",
  "documentNumber": "1234567890",
  "birthDate": "1995-04-12",
  "gender": "FEMALE",
  "email": "ana@example.com",
  "emailConfirm": "ana@example.com",
  "phone": "3001234567",
  "password": "Segura123!",
  "passwordConfirm": "Segura123!",
  "cityId": "<uuid>",
  "favoriteCinemaId": "<uuid opcional>",
  "acceptPrivacy": true,
  "acceptTerms": true,
  "acceptMarketing": false,
  "captchaToken": "dev-ok"
}
```

## Modelo incremental

```text
User 1──1 UserProfile
User 1──1 NotificationPreference
User 1──1 Membership (code único)
User 1──1 Wallet (balance 0)
```

Historial de compras: vacío de forma implícita (órdenes llegan en Sprint 3).

## Cómo probar

```bash
# 1) Obtener cityId (HU-002)
curl http://localhost:3000/api/v1/countries

# 2) Registrar
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{ ... }'

# 3) En logs de la API: enlace con token
# 4) Activar
curl -X POST http://localhost:3000/api/v1/auth/activate \
  -H 'Content-Type: application/json' \
  -d '{"token":"<token del log>"}'
```

## Archivos clave

```text
backend/src/auth/
  entities/          → User, UserProfile, NotificationPreference
  dto/               → register, activate
  captcha/           → CaptchaService (Adapter)
  validators/        → política de password + MatchField
  auth.service.ts
  auth.controller.ts

backend/src/membership/
  entities/          → Membership, Wallet
  membership.service.ts
  membership.controller.ts
```

## Fuera de alcance (siguientes HUs)

| Tema | HU |
|---|---|
| Login JWT / refresh / bloqueo 5 fallos | HU-007 |
| Perfil get/update, QR socio, historial | HU-008 |
| Motor de emails HTML | HU-015 |
