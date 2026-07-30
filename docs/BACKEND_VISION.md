# Visión del Backend — Plataforma Web Multicine

> **Documento de contexto permanente.**  
> Fuente: [`recursos/PRODUCT_BACKLOG_ORDENADO.md`](../recursos/PRODUCT_BACKLOG_ORDENADO.md).  
> Úsalo para saber qué debe hacer la API cuando **todas** las historias estén cumplidas, y para no inventar alcance fuera del backlog.

**Stack real del proyecto (adaptación del backlog):** NestJS + TypeORM + PostgreSQL + Docker Compose (el backlog original menciona Express/Sequelize; aquí usamos Nest).

---

## 0. Protocolo de trabajo (obligatorio)

1. **Temperatura baja:** no inventar features, endpoints ni entidades fuera del backlog / este documento.
2. **Al iniciar un chat nuevo o una HU:** leer este archivo completo + la HU correspondiente en `recursos/PRODUCT_BACKLOG_ORDENADO.md`.
3. **Al terminar una HU:**
   - Actualizar la tabla de **Estado** (sección siguiente).
   - Añadir una entrada en **Bitácora de avances**.
   - Reiniciar la ventana de contexto del chat (nuevo chat) con el prompt de arranque de la sección 9.
4. **Documentación educativa:** JSDoc en clases/métodos; guías en `docs/` cuando aplique.

---

## Estado del backend

| HU | Estado backend | Notas |
|---|---|---|
| HU-001 Infraestructura | **Hecho** | Nest + Docker Compose + Postgres + health + Swagger + Jest |
| HU-002 Ubicación geográfica | **Hecho** | countries/departments/cities + POST users/location + seed CO + RN-006 |
| HU-003 Cartelera semanal | **Hecho** | GET /movies + /movies/today · filtros · RN-010/011/012 · seed demo |
| HU-004 Detalle de película | **Hecho** | GET /movies/:id + recommendations · RN-014/015/016 · cast/precios |
| HU-005 Próximos estrenos | **Hecho** | GET /movies/upcoming + POST /notifications/upcoming · RN-017…020 |
| HU-006 Registro + membresía | **Hecho** | POST /auth/register + /activate · membresía/wallet · RN-021…026 |
| HU-007 Login JWT | **Hecho** | login/refresh/logout/forgot/reset · RN-027…031 · auditoría |
| HU-008 Perfil + membresía | **Hecho** | GET/PUT /profile · GET /membership · QR · RN-032…034 |
| HU-009 … HU-029 | Pendiente | Ver sección 3 |

### Bitácora de avances

#### HU-001 — Configuración de la Plataforma Base
- Monorepo Git en la raíz (se eliminó `.git` anidado de `backend/`).
- `docker-compose.yml`: servicios `api` + `db`; host DB dentro de Compose = `db`.
- Nest: `ConfigModule`, TypeORM, Helmet, CORS, Swagger `/api/docs`, prefijo `/api/v1`.
- `GET /api/v1/health` verifica API + `SELECT 1` a Postgres.
- Docs de tooling en `docs/config/`.

#### HU-002 — País / Departamento / Ciudad
- Módulo `backend/src/locations/` (entities Country, Department, City, Cinema).
- Endpoints: `GET /countries`, `GET /departments/:countryId`, `GET /cities/:departmentId`, `POST /users/location`.
- RN-006: ciudades listadas solo si activas y con ≥1 cine activo.
- Seed Colombia (incluye Guatapé sin cines y Yumbo inactiva para pruebas).
- `ValidationPipe` global; guía `docs/features/hu-002-locations.md`.
- Local Storage = frontend (fuera de alcance backend).

#### HU-003 — Cartelera semanal
- Módulo `backend/src/movies/` (entities Movie, Genre, Room, Showtime).
- Endpoints: `GET /movies`, `GET /movies/today` (query `cityId` + filtros).
- RN-010 funciones activas; RN-011 `available=true` oculta agotadas; RN-012 ventana 7 días.
- Seed demo (Medellín/Bogotá) con función agotada y una inactiva.
- Guía `docs/features/hu-003-movies.md`.
- Detalle/trailer/precios → HU-004 (fuera de alcance).

#### HU-004 — Detalle de película
- Extensión de `Movie` (banner, trailerUrl, synopsis, releaseDate) + entidad `CastMember`.
- `Showtime.price` y agregado `pricesByFormat` en el detalle.
- Endpoints: `GET /movies/:id`, `GET /movies/:id/recommendations` (query `cityId`).
- RN-014 solo funciones futuras; RN-015 `isSoldOut`; RN-016 `trailerUrl` (embed = frontend).
- Recomendaciones por género compartido (prioriza con función en la ciudad).
- Guía `docs/features/hu-004-movie-detail.md`.

#### HU-005 — Próximos estrenos
- `Movie.status` (`UPCOMING` / `NOW_SHOWING`) + entidad `MovieCityRelease` (RN-018).
- `GET /movies/upcoming?cityId=` ordenado por fecha; detalle vía `GET /movies/:id`.
- Módulo `notifications`: `POST /notifications/upcoming` (userId+email provisionales).
- RN-019 unicidad user+movie; RN-020 `promoteToNowShowing` marca avisos `SENT` (email = HU-015).
- Seed: Nocturna del Caribe / Risa Contagiosa con fechas distintas Medellín vs Bogotá.
- Guía `docs/features/hu-005-upcoming.md`.

#### HU-006 — Registro y membresía digital
- Módulos `auth` + `membership`: entidades User, UserProfile, NotificationPreference, Membership, Wallet.
- Endpoints: `POST /auth/register`, `POST /auth/activate`, `POST /membership/create`.
- RN-021…026: email único, política de password, cuenta inactiva hasta activar, membresía + código `MC-*`, billetera en 0.
- BCrypt (`bcryptjs`), CAPTCHA stub (`CAPTCHA_DEV_TOKEN`), rate-limit (`@nestjs/throttler`).
- Correo de activación = log con enlace (motor real = HU-015).
- Guía `docs/features/hu-006-auth-register.md`.

#### HU-007 — Login y autenticación segura
- Access JWT 15 min + Refresh 7 días (tabla `refresh_tokens`, hash SHA-256); RN-030 invalida refresh previo al login.
- Endpoints: `POST /auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`.
- RN-027 bloqueo 5 fallos / 15 min; RN-031 solo email verificado; auditoría `login_audits` (IP + UA).
- `JwtAuthGuard` + `@CurrentUser()` exportados para HUs siguientes; beneficios por nivel en respuesta de login.
- Guía `docs/features/hu-007-auth-login.md`.

#### HU-008 — Consulta de perfil y beneficios de membresía
- Módulo `profile`: `GET /profile`, `PUT /profile` (JWT); `UserProfile.photoUrl` opcional.
- Preferencias de notificación editables; cambio de email con re-verificación (RN-034 → `POST /auth/activate`).
- `GET /membership` (JWT): nivel, beneficios (RN-032), `qr.payload` = código único (RN-033), wallet.
- Historiales compras/puntos/reservas = arrays vacíos (stubs hasta HU-014 / HU-023 / carrito).
- Beneficios centralizados en `membership/membership-benefits.ts` (reuso login + perfil).
- Guía `docs/features/hu-008-profile-membership.md`.

---

## 1. Qué es este backend en una frase

API REST versionada (`/api/v1`) para un **cine multipantalla digital**: ubicación → cartelera → cuenta/membresía → compra de sillas y confitería → pago → entradas/QR/factura → postcompra, admin, promociones, fidelización, IA y API pública.

---

## 2. Dominios / módulos que debe tener al final

```text
infra          Health, config, Docker, Swagger, logger, seguridad base
locations      País → Departamento → Ciudad → Complejos (cines)
catalog        Películas, géneros, formatos, estrenos, recomendaciones básicas
showtimes      Funciones, salas, precios, ocupación
auth           Registro, login JWT, refresh, recovery, verificación email
users          Perfil, preferencias, ubicación favorita
membership     Membresía digital, niveles, beneficios, QR de socio
seats          Mapa de sillas, locks temporales, concurrencia
cart           Carrito (entradas + snacks), descuentos, giftcards
snacks         Catálogo de confitería / inventario de venta
payments       Órdenes, pasarela, webhooks, estados de pago
tickets        Entradas PDF/QR, validación en puerta, transferencia, reprogramación
invoices       Factura / comprobante electrónico
notifications  Correo transaccional + preferencias + avisos de estreno
admin          Backoffice CRUD + roles (JWT)
promotions     Cupones, reglas, Cine Flash
loyalty        Puntos y niveles Bronce→Platino
ai             Chatbot + motor de recomendaciones personalizadas
analytics      Dashboard KPIs gerenciales
surveys        Encuestas de satisfacción
pqrs           Peticiones, quejas, reclamos, sugerencias
public-api     API keys / OAuth para terceros
```

---

## 3. Capacidades esperadas por historia (solo backend)

Orden = orden de implementación acordado.

### Sprint 1 — Infra + Cartelera

| HU | Capacidades backend |
|---|---|
| **HU-001** | App Nest modular; Compose (api + db); env; Swagger; Jest; ESLint/Prettier; Helmet/CORS; `GET /health`; migraciones/sync en dev |
| **HU-002** | CRUD lectura de países/deptos/ciudades; cines activos; ciudad con ≥1 cine activo (RN-006); `POST /users/location` valida contexto (Local Storage es frontend) |
| **HU-003** | Cartelera 7 días filtrada por ciudad; películas activas; horarios; formatos (2D/3D/IMAX/VIP); filtros (fecha, género, clasificación, idioma, sala, formato, complejo); no mostrar agotadas si filtro “Disponible” |
| **HU-004** | Detalle de película (sinopsis, elenco, trailer URL, formatos, precios por formato, funciones futuras de la ciudad); recomendaciones similares |
| **HU-005** | Listado/detalle “próximamente”; registro de notificación de estreno (auth); evitar duplicados; disparo de aviso cuando pase a cartelera |

### Sprint 2 — Auth + inicio de compra

| HU | Capacidades backend |
|---|---|
| **HU-006** | Registro; perfil; membresía automática + código único; billetera/historial vacíos; email de activación; cuenta inactiva hasta verificar; BCrypt; política de password; CAPTCHA/rate-limit según RN |
| **HU-007** | Login email/password; Access JWT (15 min) + Refresh (7 días); logout; forgot/reset password; bloqueo tras 5 fallos / 15 min; auditoría IP/dispositivo; solo usuarios verificados |
| **HU-008** | Perfil get/update; membresía y beneficios; QR de socio; historial compras/puntos; preferencias de notificación; cambio de email con re-verificación |
| **HU-009** | Funciones por película (fecha, complejo, sala, hora, formato, idioma/audio); precios dinámicos; solo funciones futuras/activas |
| **HU-010** | Plano de sillas por función; estados (libre, lock, vendida, etc.); lock ~10 min; release; control de concurrencia anti doble-venta; resumen de selección |

### Sprint 3 — Checkout + documentos + acceso

| HU | Capacidades backend |
|---|---|
| **HU-011** | Carrito único por usuario; entradas + snacks; descuentos membresía/promos/giftcard; expiración ~10 min; CRUD carrito |
| **HU-012** | Catálogo snacks por categoría; stock; add/update/remove en carrito; pickup en complejo |
| **HU-013** | Crear pago; múltiples medios (tarjeta, PSE, Nequi, etc.); revalidar sillas; webhooks; estados (pendiente/pagado/rechazado); idempotencia |
| **HU-014** | Tras pago OK: tickets digitales + QR único; factura/comprobante; consulta de tickets/factura |
| **HU-015** | Motor de emails (registro, compra, pago fallido, recordatorios, transferencias, etc.); preferencias de notificación |
| **HU-024** | `POST /tickets/validate` (escaneo QR); marcar UTILIZADA; rechazar reuso; datos de función/sala |

### Sprint 4 — Admin + postcompra + fidelización

| HU | Capacidades backend |
|---|---|
| **HU-020** | Backoffice `/api/admin/*`: CRUD catálogos (geo, cines, salas, sillas, películas, funciones, precios, snacks, usuarios, roles); JWT + RBAC |
| **HU-026** | CRUD promociones/cupones; reglas de vigencia/combinación; aplicación en carrito/pago |
| **HU-016** | Listar reservas; funciones alternativas; cambio de función; ajuste económico; regenerar tickets/QR |
| **HU-017** | Transferir entradas a otro usuario/email; aceptar; nuevo QR; auditoría; invitar si no tiene cuenta |
| **HU-018** | Venta giftcards; códigos/QR; envío programado email; consulta/redención; saldo en billetera |
| **HU-023** | Acumulación de puntos por compra; redención; niveles Bronce/Plata/Oro/Platino; beneficios por nivel |

### Sprint 5 — Inteligencia + experiencia + integraciones

| HU | Capacidades backend |
|---|---|
| **HU-019** | Job ~cada 5 min; si falta 1 h y ocupación &lt; 60% → Cine Flash (dto automático, máx. 3 entradas); listar funciones en flash; apagar al llenar/iniciar |
| **HU-021** | Chat IA: sesión/historial; respuestas con cartelera real y reglas de negocio; no inventar funciones inexistentes |
| **HU-022** | Recomendaciones por historial/preferencias; CRUD preferencias; endpoints de feed personalizado |
| **HU-025** | Agregados KPIs (ocupación, ventas, snacks, membresías, etc.) para dashboard gerencial |
| **HU-027** | Crear/consultar encuestas post-visita; almacenar respuestas |
| **HU-028** | Alta/seguimiento PQRS; estados; asignación interna |
| **HU-029** | API pública documentada; API Keys/OAuth; scopes; rate limit; subset seguro de recursos (cartelera, funciones, auth, órdenes, membresía) |

---

## 4. Entidades de negocio núcleo (mapa mental)

```text
Country → Department → City → Cinema → Room → Seat
Movie ←→ Genre / Cast / Format
Showtime (Function): Movie + Room + datetime + format + language + price
User → Profile → Membership → Points / Wallet(Giftcards)
SeatLock / Reservation → Cart → Order → Payment
Order → Ticket(QR) + Invoice
Promotion / Coupon / CineFlashCampaign
NotificationPreference + Outbox emails
Survey / PQRS
AdminRole / Permission
ApiClient (keys) for HU-029
```

---

## 5. Reglas transversales que el backend debe respetar siempre

1. **Config por entorno** (RN-002): secretos y hosts vía `.env` / Compose.  
2. **Controller → Service → Repository** (RN-004): sin SQL en controllers.  
3. **API REST versionada** `/api/v1` (+ `/api/admin` para backoffice).  
4. **Swagger** al día con cada módulo.  
5. **Ciudad como contexto**: casi toda cartelera/función filtra por ciudad/complejo.  
6. **Auth JWT** protege compra, perfil, admin; catálogo público de lectura puede ser abierto.  
7. **Concurrencia de sillas**: locks con TTL; nunca doble venta.  
8. **Pagos**: confiar en webhook/verificación de pasarela; no marcar pagado solo por redirect.  
9. **Tickets QR**: únicos, auditables, un solo uso en puerta.  
10. **Documentación educativa**: JSDoc en clases/métodos (estándar del repo de práctica).

---

## 6. Qué NO es responsabilidad del backend

| Tema | Quién |
|---|---|
| Local Storage de ciudad | Frontend (RN-008) |
| UI del mapa de sillas / cartelera visual | Frontend (consume API) |
| Reproducir trailer YouTube embebido | Frontend (backend solo URL/id) |
| Pasarela bancaria real (UI del banco) | Proveedor externo + webhooks nuestros |

---

## 7. Flujo feliz end-to-end (cuando todo exista)

```text
Health OK
  → Elegir País/Depto/Ciudad (cines activos)
  → Ver cartelera 7 días / detalle / próximos estrenos
  → Registrarse + verificar email + login JWT
  → Elegir función + formato + sillas (lock)
  → Carrito (+ snacks, cupón, puntos, giftcard)
  → Pagar → webhook OK
  → Tickets QR + factura + emails
  → (Opcional) reprogramar / transferir / escanear en puerta
  → Admin opera catálogo; Cine Flash / promos / KPIs / IA / API pública
```

---

## 8. Cómo usar este documento en el chat

- Antes de implementar una HU: localizar su fila en la **sección 3** y limitar el alcance a eso.  
- Si una idea **no aparece** aquí ni en el backlog ordenado: **no implementarla** sin acuerdo explícito.  
- Al cerrar una HU: actualizar **Estado** + **Bitácora** (arriba) y abrir chat nuevo (sección 9).

**Referencias de detalle:**

- Backlog completo: `recursos/PRODUCT_BACKLOG_ORDENADO.md`
- HU-002 guía: `docs/features/hu-002-locations.md`
- HU-003 guía: `docs/features/hu-003-movies.md`
- HU-004 guía: `docs/features/hu-004-movie-detail.md`
- HU-005 guía: `docs/features/hu-005-upcoming.md`
- HU-006 guía: `docs/features/hu-006-auth-register.md`
- HU-007 guía: `docs/features/hu-007-auth-login.md`
- HU-008 guía: `docs/features/hu-008-profile-membership.md`
- Tooling: `docs/config/README.md`

---

## 9. Prompt de arranque (nuevo chat / reinicio de contexto)

Copia esto al iniciar el siguiente chat:

```text
Proyecto: Plataforma Web Multicine (backend NestJS).
Lee docs/BACKEND_VISION.md (protocolo, estado, bitácora) y continúa SOLO con la siguiente HU pendiente.
Temperatura baja: no inventes alcance fuera del backlog en recursos/PRODUCT_BACKLOG_ORDENADO.md.
Mantén JSDoc educativo. Al terminar la HU, actualiza Estado + Bitácora en docs/BACKEND_VISION.md.
Siguiente: HU-009 Selección de Función y Formato de Proyección.
```
