# HU-007 — Inicio de Sesión y Autenticación Segura (Backend)

## Qué resuelve

El usuario verificado inicia sesión y recibe:

```text
email + password
  → validar (RN-027…031)
  → Access JWT (15 min) + Refresh (7 días, en BD)
  → perfil básico + membresía + beneficios por nivel
  → auditoría IP / User-Agent
```

También: renovar Access, cerrar sesión y recuperar contraseña.

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Credenciales → tokens + perfil |
| `POST` | `/auth/refresh` | Refresh → nuevo Access |
| `POST` | `/auth/logout` | Revoca Refresh |
| `POST` | `/auth/forgot-password` | Solicita reset (respuesta genérica) |
| `POST` | `/auth/reset-password` | Aplica nueva password con token |

Swagger: http://localhost:3000/api/docs → tag **Auth** (candado Bearer).

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-027** | 5 fallos → `lockedUntil` = now + 15 min |
| **RN-028** | Access JWT vigencia 15 min |
| **RN-029** | Refresh vigencia 7 días (fila en `refresh_tokens`) |
| **RN-030** | Cada login revoca refreshes previos del usuario |
| **RN-031** | Solo `isEmailVerified && isActive` pueden entrar |

## Seguridad

- Access JWT firmado con `JWT_SECRET` (Bearer).
- Refresh opaco: se guarda **SHA-256** en BD; el cliente recibe el valor en claro una vez.
- BCrypt en password (igual que HU-006).
- Auditoría en `login_audits` (IP + User-Agent + éxito/fallo).
- Correos de reset = log hasta HU-015.
- Rate-limit en login / forgot / reset.

## Guard para rutas futuras

```ts
@UseGuards(JwtAuthGuard)
@Get('algo')
handler(@CurrentUser() user: AuthUser) { ... }
```

Exportado desde `AuthModule` para HU-008+.

## Modelo incremental

```text
User += failedLoginAttempts, lockedUntil, passwordReset*
RefreshToken(userId, tokenHash, expiresAt, revokedAt, ip, ua)
LoginAudit(userId?, email, success, reason, ip, ua)
```

## Cómo probar

```bash
# Tras registro + activate (HU-006):
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"Segura123!"}'

curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<del login>"}'

curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<del login>"}'
```

## Archivos clave

```text
backend/src/auth/
  jwt/                 → JwtStrategy, JwtAuthGuard, payload
  entities/            → RefreshToken, LoginAudit (+ campos User)
  dto/login|refresh|logout|forgot|reset
  membership-benefits.ts
  auth.service.ts      → login / refresh / logout / reset
```

## Fuera de alcance

| Tema | HU |
|---|---|
| Perfil get/update, QR socio | HU-008 |
| Motor emails HTML | HU-015 |
| Roles admin / RBAC | HU-020 |
