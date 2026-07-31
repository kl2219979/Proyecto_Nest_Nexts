# Librerías del backend Multicine

Documento exclusivo de las dependencias declaradas en
[`backend/package.json`](../backend/package.json).

Para cada librería: **qué hace** y **por qué nos ayudó** en la Plataforma Web
Multicine (NestJS + TypeORM + PostgreSQL).

Versiones: las indicadas en `package.json` (pueden resolverse a un patch más
nuevo vía `package-lock.json`).

---

## Cómo leer este documento

| Sección | Contenido |
|---|---|
| [1. Núcleo NestJS](#1-núcleo-nestjs) | Framework, HTTP, DI, módulos |
| [2. Persistencia](#2-persistencia) | TypeORM + driver Postgres |
| [3. Configuración y seguridad HTTP](#3-configuración-y-seguridad-http) | Env, Helmet, rate limit |
| [4. Autenticación](#4-autenticación) | JWT, Passport, bcrypt |
| [5. Validación de entrada](#5-validación-de-entrada) | DTOs, pipes |
| [6. Documentación API](#6-documentación-api) | Swagger / OpenAPI |
| [7. Jobs y tiempo](#7-jobs-y-tiempo) | Crons (emails, Cine Flash, …) |
| [8. Documentos y códigos](#8-documentos-y-códigos) | PDF de entradas/factura, QR |
| [9. Utilidades de runtime](#9-utilidades-de-runtime) | RxJS, reflect-metadata |
| [10. Herramientas de desarrollo](#10-herramientas-de-desarrollo) | CLI, TypeScript, lint, tests |

Las librerías `@types/*` solo aportan tipado TypeScript; no se ejecutan en
producción. Se listan al final de la sección 10.

---

## 1. Núcleo NestJS

### `@nestjs/common`

- **Qué hace:** API pública del framework: decoradores (`@Controller`,
  `@Injectable`, `@Get`…), excepciones HTTP, pipes, guards, interceptors,
  pipes de validación globales.
- **Por qué nos ayudó:** Toda la API (`/api/v1`, `/api/admin`, `/api/v1/public`)
  se organiza con controllers y services. Los guards (JWT, roles, API Key) y
  los interceptors de auditoría (admin / API pública) viven sobre estas
  abstracciones.

### `@nestjs/core`

- **Qué hace:** Contenedor de inyección de dependencias, bootstrap de la app
  (`NestFactory`), providers globales (`APP_GUARD`).
- **Por qué nos ayudó:** Conecta módulos feature (movies, payments, public-api…)
  sin acoplarlos a mano. El `ThrottlerGuard` global se registra aquí vía
  `APP_GUARD` en `AppModule`.

### `@nestjs/platform-express`

- **Qué hace:** Adaptador HTTP sobre Express (el servidor que escucha el
  puerto).
- **Por qué nos ayudó:** Es el runtime HTTP por defecto de Nest. CORS, Helmet,
  body parsing y Swagger se montan sobre esta capa en `main.ts`.

### `rxjs`

- **Qué hace:** Librería de streams reactivos (Observables). Nest la usa en el
  pipeline de requests (interceptors).
- **Por qué nos ayudó:** Los interceptors de auditoría (`AdminAuditInterceptor`,
  `PublicApiAuditInterceptor`) usan `tap` de RxJS para registrar éxito/error
  **sin** modificar la respuesta al cliente.

---

## 2. Persistencia

### `typeorm`

- **Qué hace:** ORM: entidades (`@Entity`), repositorios, QueryBuilder,
  relaciones, transacciones.
- **Por qué nos ayudó:** Modelamos de forma incremental por HU (películas,
  sillas, órdenes, tickets, ApiClient, PQRS…). Las reglas anti doble-venta,
  locks y consultas de cartelera usan repositorios/QueryBuilder en lugar de
  SQL crudo en controllers (RN-004).

### `@nestjs/typeorm`

- **Qué hace:** Integración oficial Nest ↔ TypeORM (`TypeOrmModule.forRoot`,
  `forFeature`, `@InjectRepository`).
- **Por qué nos ayudó:** Cada módulo feature declara solo las entidades que
  necesita; `autoLoadEntities` en `AppModule` simplifica el arranque en
  desarrollo (`synchronize` vía env).

### `pg`

- **Qué hace:** Driver oficial de Node.js para PostgreSQL.
- **Por qué nos ayudó:** TypeORM lo usa bajo el capó para hablar con el
  contenedor `db` de Docker Compose. Sin `pg` no hay conexión real a Postgres.

---

## 3. Configuración y seguridad HTTP

### `@nestjs/config`

- **Qué hace:** Carga `.env`, valida variables y expone `ConfigService`.
- **Por qué nos ayudó:** Secretos (`JWT_SECRET`, claves de pago, DB) no van en
  código (RN-002). `validateEnv` hace fallar el arranque si falta algo crítico.

### `helmet`

- **Qué hace:** Middleware que añade cabeceras HTTP de seguridad (XSS,
  clickjacking, sniffing MIME, etc.).
- **Por qué nos ayudó:** Endurece la API desde `main.ts` sin escribir cada
  header a mano; requisito de seguridad base (HU-001 y HUs de auth/pagos).

### `@nestjs/throttler`

- **Qué hace:** Rate limiting (límite de peticiones por IP/ventana).
- **Por qué nos ayudó:** Protege registro/login frente a fuerza bruta (HU-006)
  y da un techo global. La API pública (HU-029) añade además un tope **por
  ApiClient** encima de este guard.

---

## 4. Autenticación

### `@nestjs/jwt`

- **Qué hace:** Firmar y verificar JSON Web Tokens.
- **Por qué nos ayudó:** Access token ~15 min y claims de sesión (HU-007).
  También firma tokens OAuth `client_credentials` de la API pública (HU-029)
  con claim `tokenUse: api_client`.

### `@nestjs/passport` + `passport` + `passport-jwt`

- **Qué hace:** Passport es un middleware de estrategias de auth; `passport-jwt`
  extrae y valida el Bearer JWT; Nest lo envuelve en `JwtStrategy` / guards.
- **Por qué nos ayudó:** Patrón Strategy: el mismo `JwtAuthGuard` protege
  perfil, carrito, pagos, admin y rutas duales de `/public` sin reescribir
  controllers. Intercambiable conceptualmente con API Key (HU-029).

### `bcryptjs`

- **Qué hace:** Hash de contraseñas (BCrypt) en JavaScript puro.
- **Por qué nos ayudó:** Nunca guardamos el password en claro (HU-006/007).
  Compatible multiplataforma sin binarios nativos (`bcrypt` nativo suele ser
  más frágil en Docker).

---

## 5. Validación de entrada

### `class-validator`

- **Qué hace:** Decoradores de validación sobre clases (`@IsEmail`, `@IsUUID`,
  `@MinLength`…).
- **Por qué nos ayudó:** Todos los DTOs (registro, pago, PQRS, ApiClient…)
  rechazan cuerpos inválidos antes de tocar la lógica de negocio.

### `class-transformer`

- **Qué hace:** Transforma JSON plano ↔ instancias de clase; convierte tipos
  (string → number/boolean).
- **Por qué nos ayudó:** Junto al `ValidationPipe` global (`transform: true`),
  query params como `available=true` o UUIDs llegan tipados a los services.

---

## 6. Documentación API

### `@nestjs/swagger`

- **Qué hace:** Genera OpenAPI a partir de decoradores (`@ApiTags`,
  `@ApiBearerAuth`, `@ApiProperty`) y monta Swagger UI.
- **Por qué nos ayudó:** Contrato vivo en `/api/docs` (RN-118 / HU-001 / HU-029).
  Soporta Bearer JWT y API Key (`X-API-Key`) para probar first-party y
  consumidores externos.

---

## 7. Jobs y tiempo

### `@nestjs/schedule`

- **Qué hace:** Cron jobs declarativos (`@Cron`) dentro de Nest.
- **Por qué nos ayudó:** Recordatorios de función por email (HU-015), Cine Flash
  cada ~5 min (HU-019), entrega programada de giftcards (HU-018) y snapshot
  diario de recomendaciones (HU-022) sin un worker externo aparte.

---

## 8. Documentos y códigos

### `pdfkit`

- **Qué hace:** Generación de PDF en Node (API de dibujo/texto).
- **Por qué nos ayudó:** Entradas y facturas descargables (HU-014) y export del
  dashboard gerencial (HU-025) sin un servicio de documentos externo.

### `qrcode`

- **Qué hace:** Genera códigos QR (Buffer/DataURL/archivo).
- **Por qué nos ayudó:** QR único por ticket (HU-014), validación en puerta
  (HU-024), QR de membresía (HU-008) y códigos de giftcard (HU-018).

---

## 9. Utilidades de runtime

### `reflect-metadata`

- **Qué hace:** Polyfill del Reflection API que usan los decoradores de
  TypeScript / Nest / TypeORM / class-validator.
- **Por qué nos ayudó:** Sin él, DI, entidades y validación por decoradores no
  funcionan. Se importa al arrancar la app.

### `rxjs` (ver también §1)

Usado explícitamente en interceptors de auditoría; Nest también lo necesita
internamente para el ciclo request/response.

---

## 10. Herramientas de desarrollo

Estas dependencias **no** van en la imagen de producción típica (salvo el
artefacto ya compilado). Sirven para construir, tipar, formatear y probar.

### CLI y build Nest / TypeScript

| Librería | Qué hace | Por qué nos ayudó |
|---|---|---|
| `@nestjs/cli` | Comandos `nest build`, `nest start`, generadores | Compilar y levantar la API en watch |
| `@nestjs/schematics` | Plantillas de generación Nest | Base del CLI al crear módulos/controllers |
| `typescript` | Compilador TS → JS | Tipado estricto en todo el dominio Multicine |
| `ts-node` | Ejecutar TypeScript directo | Tests/debug y scripts |
| `ts-loader` | Loader TS para bundlers Webpack | Usado por el pipeline de build Nest cuando aplica |
| `tsconfig-paths` | Resuelve paths de `tsconfig` en runtime | Imports consistentes en tests/debug |
| `source-map-support` | Stack traces apuntando a `.ts` | Depurar errores con líneas del fuente |

### Testing

| Librería | Qué hace | Por qué nos ayudó |
|---|---|---|
| `jest` | Runner de tests unitarios | Specs de services (cartelera, auth, pagos…) |
| `ts-jest` | Transforma TS en Jest | Escribir specs en TypeScript |
| `@nestjs/testing` | `Test.createTestingModule` | Mockear repos/providers al estilo Nest |
| `supertest` | Cliente HTTP para e2e | Probar endpoints reales sobre la app Nest |

### Calidad de código

| Librería | Qué hace | Por qué nos ayudó |
|---|---|---|
| `eslint` | Linter JavaScript/TypeScript | Detectar bugs y malas prácticas |
| `typescript-eslint` | Reglas ESLint conscientes de tipos | Alineado al código Nest tipado |
| `@eslint/js` / `@eslint/eslintrc` | Config base ESLint 9 (flat config) | Arranque del `eslint.config.mjs` del repo |
| `eslint-config-prettier` | Desactiva reglas que chocan con Prettier | Evitar conflictos formato vs lint |
| `eslint-plugin-prettier` | Reporta Prettier como reglas ESLint | Un solo comando `npm run lint` |
| `prettier` | Formateador de código | Estilo uniforme en el monorepo |
| `globals` | Lista de globals (Node, browser…) | Config ESLint sin falsos positivos |

### Tipados (`@types/*`)

| Paquete | Para tipar |
|---|---|
| `@types/node` | APIs de Node (crypto, process, Buffer…) |
| `@types/express` | Request/Response en controllers y guards |
| `@types/jest` | `describe` / `expect` en specs |
| `@types/supertest` | Cliente e2e |
| `@types/bcryptjs` | Hash de passwords |
| `@types/passport-jwt` | Strategy JWT |
| `@types/pdfkit` | Generación PDF |
| `@types/qrcode` | Generación QR |

---

## Mapa rápido: librería → HUs donde más se nota

| Librería | HUs / áreas |
|---|---|
| Nest + TypeORM + `pg` | Todas (base HU-001) |
| `@nestjs/config` + `helmet` + throttler | HU-001, HU-006, HU-029 |
| JWT / Passport / bcryptjs | HU-006, HU-007, HU-020, HU-029 |
| class-validator / transformer | Todas las que exponen DTOs |
| `@nestjs/swagger` | HU-001 … HU-029 (RN-118) |
| `@nestjs/schedule` | HU-015, HU-018, HU-019, HU-022 |
| `pdfkit` + `qrcode` | HU-008, HU-014, HU-018, HU-024, HU-025 |
| Jest / Testing / supertest | Calidad continua del backend |

---

## Qué no es una “librería npm” (pero conviene no confundir)

| Pieza | Rol |
|---|---|
| **PostgreSQL** | Motor de base de datos (servicio Docker `db`) |
| **Docker / Compose** | Empaqueta API + DB; no es dependencia de `package.json` |
| **Node.js** | Runtime donde corre Nest |

---

## Referencias

- Dependencias: [`backend/package.json`](../backend/package.json)
- Arranque y módulos: [`backend/README.md`](../backend/README.md)
- Visión y estado de HUs: [`BACKEND_VISION.md`](./BACKEND_VISION.md)
- Tooling (ESLint, Prettier, Docker, env): [`config/README.md`](./config/README.md)
