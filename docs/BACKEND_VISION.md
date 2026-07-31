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
| HU-009 Funciones / formato | **Hecho** | GET /movies/:id/functions · GET /functions/:id/prices · RN-035…038 |
| HU-010 Selección de sillas | **Hecho** | GET/POST /functions/:id/seats · reservations · RN-039…043 |
| HU-011 Carrito de compras | **Hecho** | CRUD /cart · apply-membership/promo · RN-044…048 |
| HU-012 Confitería | **Hecho** | GET /snacks · POST/PUT/DELETE /cart/snacks · RN-049…052 |
| HU-013 Proceso de pago | **Hecho** | POST/GET /payments · webhook HMAC · órdenes · RN-053…056 |
| HU-014 Entradas + factura | **Hecho** | GET /tickets · GET /invoice/:id · PDF/QR · RN-057…060 |
| HU-015 Notificaciones email | **Hecho** | Motor correo + historial + prefs · RN-061…064 · cron recordatorios |
| HU-024 Escaneo QR puerta | **Hecho** | POST /tickets/validate · VALID→USED · RN-102…104 · STAFF+ (HU-020) |
| HU-020 Panel administrativo | **Hecho** | /api/admin/* · RBAC · CRUD catálogos · auditoría · reportes |
| HU-026 Promociones y cupones | **Hecho** | CRUD /promotions · RN-105…107 · carrito + precios · redenciones |
| HU-016 Cambio de función | **Hecho** | GET /orders · available-functions · PUT reschedule · regenerate · RN-065…070 |
| HU-017 Transferencia entradas | **Hecho** | POST/GET /tickets/transfer · accept · invite · RN-071…075 |
| HU-018 Bonos de regalo | **Hecho** | POST/GET /giftcards · redeem · webhook · cart apply · RN-076…079 |
| HU-023 … HU-029 (resto) | Pendiente | Ver sección 3 (siguiente: HU-023) |

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

#### HU-009 — Selección de función y formato de proyección
- `ShowtimesService` + `FunctionsController` en módulo `movies`.
- `GET /movies/:id/functions?cityId=` con filtros (fecha, complejo, formato, idioma, audio, sala, available).
- RN-035 solo futuras; RN-036 solo activas; disponibilidad de sillas (`availableSeats` / `isSelectable`).
- Facetas en la respuesta para cambiar formato/filtros sin recargar el catálogo.
- `GET /functions/:id/prices`: precio por función (RN-037) + `promotions: []` (RN-038 stub → HU-026).
- Guía `docs/features/hu-009-functions.md`.

#### HU-010 — Selección interactiva de sillas
- Módulo `backend/src/seats/`: entidades `Seat`, `SeatLock`, `SeatLockAudit`.
- `Showtime.maxSeatsPerOrder` (default 8); seed de planos por sala + SOLD alineado a `soldSeats`.
- `GET /functions/:id/seats` (JWT opcional → SELECTED / mySelection).
- `POST /functions/:id/seats` lock 10 min (RN-039) + resumen; unique anti doble-venta (RN-043).
- `GET /reservations` · `DELETE /reservations/release-seats`; expiración perezosa (RN-040).
- RN-041 ocupadas/inhabilitadas; RN-042 preferenciales con `acknowledgePreferential`.
- Guía `docs/features/hu-010-seats.md`.

#### HU-011 — Administración del carrito de compras
- Módulo `backend/src/cart/`: entidades `Cart`, `CartTicketItem`, `CartSnackItem`.
- Endpoints JWT: `POST/GET/PUT/DELETE /cart`, `POST /cart/apply-membership`, `POST /cart/apply-promo`.
- RN-044 un ACTIVE por usuario; RN-045 extiende locks con actividad del carrito; RN-046 TTL 10 min.
- RN-047 descuento membresía automático (`benefitsForLevel`); RN-048 promos demo no apilables.
- Snacks en carrito vía `PUT` (estructura); catálogo/stock → HU-012; giftcard saldo → HU-018.
- Guía `docs/features/hu-011-cart.md`.

#### HU-012 — Compra de productos de confitería
- Módulo `backend/src/snacks/`: entidad `Snack` (categoría, precio, stock, promo stub, cinemaId opcional).
- `GET /snacks` catálogo agrupado; filtros `cinemaId` / `category`; seed con producto agotado demo.
- `POST/PUT/DELETE /cart/snacks` con validación de stock (RN-049) sin descontar inventario (RN-052).
- RN-051 descuento membresía `SNACK_*` en totales; pickup = cine de la función (`cart.pickup`).
- Guía `docs/features/hu-012-snacks.md`.

#### HU-013 — Proceso de pago seguro
- Módulo `backend/src/payments/`: entidades `Order`, `OrderTicketItem`, `OrderSnackItem`, `Payment`, `PaymentAudit`.
- Endpoints JWT: `POST /payments`, `GET /payments`, `GET /payments/:id`; webhook `POST /payments/webhook` (HMAC).
- Medios: CREDIT_CARD / DEBIT_CARD / PSE / NEQUI / DAVIPLATA; tokenización (sin PAN); payload AES-256-GCM.
- RN-053 confirmación solo por webhook firmado; RN-054 libera sillas si REJECTED; RN-055 auditoría; RN-056 idempotencia.
- Tras APPROVED: locks → SOLD, `soldSeats++`, stock snacks −, carrito COMPLETED + tickets/factura (HU-014).
- `PaymentGatewayService` (Adapter); env `PAYMENT_AES_KEY` / `PAYMENT_WEBHOOK_SECRET`.
- Guía `docs/features/hu-013-payments.md`.

#### HU-014 — Entradas digitales y factura electrónica
- Módulo `backend/src/tickets/`: entidades `Ticket`, `Invoice`; `DocumentPdfService` (PDFKit + QR).
- Tras webhook APPROVED: `fulfillPaidOrder` crea 1 ticket/QR por silla + factura 1:1; flags en `Order`.
- Endpoints JWT: `GET /tickets`, `GET /tickets/:id`, `GET /tickets/:id/pdf`, `GET /invoice/:id`, `GET /invoice/:id/pdf`.
- RN-057 QR único; RN-058/060 un solo uso (`VALID`→`USED` en HU-024); RN-059 PDF regenerable.
- `GET /membership.purchaseHistory` lista facturas emitidas.
- Guía `docs/features/hu-014-tickets-invoice.md`.
- Email con adjuntos → HU-015; escaneo puerta → HU-024.

#### HU-015 — Notificaciones automáticas por correo
- Extensión de `notifications/`: `EmailService` + `EmailGatewayService` (Adapter) + plantillas HTML.
- Entidad `EmailNotification` (historial/outbox); reintentos ×3 (RN-063); prefs marketing/upcoming (RN-062).
- Endpoints JWT: `GET/POST /notifications/email`, `GET/PUT/POST /notifications/preferences`.
- Disparos: registro/activación/reset/perfil, compra+factura (RN-064), pago rechazado, estrenos, recordatorios 24h/2h (`@Cron` cada 5 min).
- `EMAIL_FORCE_FAIL` para simular fallos; envío real = log stub (sustituible por proveedor).
- Guía `docs/features/hu-015-email-notifications.md`.
- Push / SMTP productivo / transferencias = fuera de alcance (HUs posteriores).

#### HU-024 — Escaneo y validación de código QR
- Extensión de `tickets/`: `Ticket.validatedByUserId` + `POST /tickets/validate` (JWT colaborador).
- Valida existencia, orden PAID, estado VALID; marca `USED` con update atómico anti carrera.
- RN-102 un solo uso; RN-103 `usedAt`; RN-104 colaborador del JWT; alerta 409 si reuso.
- Respuesta con película/sala/silla/hora para confirmación en dispositivo de puerta.
- Roles STAFF formales → HU-020; guía `docs/features/hu-024-ticket-validate.md`.

#### HU-020 — Panel Administrativo del Multicine
- Módulo `backend/src/admin/`: backoffice bajo `/api/admin/*` (excluido del prefijo `v1`).
- RBAC: `User.role` (`CUSTOMER`/`STAFF`/`ADMIN`/`SUPER_ADMIN`) + claim en JWT + `RolesGuard`.
- CRUD: geo, cines, salas, sillas, películas (publish/promote), funciones, snacks, usuarios/roles.
- Ventas: listado órdenes/pagos/facturas; reportes (diario+CSV, ocupación, top movies/snacks, membresías).
- Auditoría `admin_audit_logs` (RN-087/090) vía interceptor; seed `admin@` / `staff@`.
- `POST /tickets/validate` exige STAFF+; guía `docs/features/hu-020-admin.md`.
- Promos formales → HU-026; Cine Flash → HU-019; KPI gerencial → HU-025.

#### HU-026 — Administración de Promociones y Cupones
- Módulo `backend/src/promotions/`: entidades `Promotion` + `PromotionRedemption`.
- CRUD: `GET/POST/PUT/DELETE /api/admin/promotions` (auditoría) + espejo ADMIN en `/api/v1/promotions`.
- Público: `GET /api/v1/promotions` (activas/vigentes).
- Tipos: 2x1, %, combo, cumpleaños, membresía, temporada, Black Friday, Cine Flash (tipología).
- Reglas: RN-105 apilables · RN-106 vigencia · RN-107 max por usuario; scopes ciudad/cine/sala/película/género/formato.
- Integración: `POST /cart/apply-promo` (reemplaza DEMO_PROMOS); `GET /functions/:id/prices` (RN-038); redención al pago PAID.
- Seed: `MULTICINE10`, `SNACK5K`, `TWO4ONE`, `BDAY20`, `BLACK30` + promo automática 15%.
- Guía `docs/features/hu-026-promotions.md`.
- Cine Flash automático → HU-019.

#### HU-016 — Cambio de Función (Reprogramación de Reserva)
- Módulo `backend/src/reschedule/`: `RescheduleService` + `OrdersController` + auditoría `reschedule_audits`.
- Endpoints JWT: `GET /orders`, `GET /orders/:id/available-functions`, `PUT /orders/:id/reschedule`, `POST /tickets/regenerate`.
- Flujo: lock sillas nuevas (HU-010) → anular QR (`CANCELLED`) → liberar SOLD viejas → confirmar SOLD nuevas → mismas líneas de orden (RN-069) → nuevos tickets.
- RN-065 ventana 1 h · RN-066/067 solo futuras · RN-068 invalidar QR · RN-070 auditoría.
- Ajuste económico: crédito/débito de billetera; correo `FUNCTION_CHANGED` (HU-015).
- Guía `docs/features/hu-016-reschedule.md`.
- Transferencia de entradas → HU-017.

#### HU-017 — Transferencia de Entradas a Otro Usuario
- Módulo `backend/src/transfer/`: `TransferService` + `TransferController` + entidad `ticket_transfers`.
- Endpoints JWT: `POST /tickets/transfer`, `GET /tickets/transfer`, `POST /tickets/transfer/accept`.
- Flujo: solicitar (nombre/email/documento) → PENDING → aceptar → anular QR → emitir nuevos al destinatario.
- Sin cuenta: correo de invitación a registrarse; tras `POST /auth/activate` se enlaza `toUserId` (sigue haciendo falta aceptar).
- RN-071 ventana 1 h · RN-072 una sola cesión (`Ticket.transferCount`) · RN-073 aceptación · RN-074 invalidar QR · RN-075 auditoría.
- Correo `TICKET_TRANSFER` (request / invite / accepted); orden/factura del comprador original intactas.
- Guía `docs/features/hu-017-transfer.md`.
- Giftcards → HU-018.

#### HU-018 — Compra y Envío de Bonos de Regalo Digitales
- Módulo `backend/src/giftcards/`: entidad `Giftcard` + `GiftcardsService` + webhook propio + cron de entrega.
- Endpoints: `POST/GET /giftcards`, `GET /giftcards/:code`, `POST /giftcards/redeem`, `POST /giftcards/webhook`.
- Compra con pasarela stub (AES/HMAC reutilizado); tras APPROVED: código `MCGC-*` + QR + correo inmediato o `scheduledSendAt`.
- RN-076 código único · RN-077 uso parcial · RN-078 expiración · RN-079 entradas+snacks vía `POST /cart/apply-giftcard`.
- Redención a billetera (`Wallet`) o descuento en carrito (débito al PAID de la orden).
- Guía `docs/features/hu-018-giftcards.md`.
- Fidelización / puntos → HU-023.

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
- HU-009 guía: `docs/features/hu-009-functions.md`
- HU-010 guía: `docs/features/hu-010-seats.md`
- HU-011 guía: `docs/features/hu-011-cart.md`
- HU-012 guía: `docs/features/hu-012-snacks.md`
- HU-013 guía: `docs/features/hu-013-payments.md`
- HU-014 guía: `docs/features/hu-014-tickets-invoice.md`
- HU-015 guía: `docs/features/hu-015-email-notifications.md`
- HU-024 guía: `docs/features/hu-024-ticket-validate.md`
- HU-020 guía: `docs/features/hu-020-admin.md`
- HU-026 guía: `docs/features/hu-026-promotions.md`
- HU-016 guía: `docs/features/hu-016-reschedule.md`
- HU-017 guía: `docs/features/hu-017-transfer.md`
- HU-018 guía: `docs/features/hu-018-giftcards.md`
- Tooling: `docs/config/README.md`

---

## 9. Prompt de arranque (nuevo chat / reinicio de contexto)

Copia esto al iniciar el siguiente chat:

```text
Proyecto: Plataforma Web Multicine (backend NestJS).
Lee docs/BACKEND_VISION.md (protocolo, estado, bitácora) y continúa SOLO con la siguiente HU pendiente.
Temperatura baja: no inventes alcance fuera del backlog en recursos/PRODUCT_BACKLOG_ORDENADO.md.
Mantén JSDoc educativo. Al terminar la HU, actualiza Estado + Bitácora en docs/BACKEND_VISION.md.
Siguiente: HU-023 Programa de Fidelización y Acumulación de Puntos.
```
