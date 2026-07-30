# `.env.example` — plantilla de variables de entorno

## ¿Qué es?

Un archivo **modelo** con todas las variables que el proyecto necesita para
arrancar, usando valores de ejemplo (no secretos de producción).

Convención de la industria:

| Archivo | ¿Va a Git? | Contiene secretos reales? | Para qué |
|---|---|---|---|
| `.env.example` | **Sí** | No (placeholders) | Enseña qué variables existen |
| `.env` | **No** (`.gitignore`) | Sí | Valores reales de tu máquina/servidor |

## ¿Por qué existe en este proyecto?

La HU-001 exige configuración por variables de entorno (RN-002). Sin una
plantilla versionada, cada persona inventaría nombres distintos
(`DB_HOST` vs `DATABASE_HOST`) y la app fallaría al validar el entorno.

Flujo estándar:

```bash
cp .env.example .env
# editas .env (contraseñas, etc.)
docker compose up --build
```

## Quién lee estas variables

```text
.env (raíz)
  │
  ├─ docker-compose.yml
  │     • ${POSTGRES_USER} etc. para crear el contenedor db
  │     • env_file + environment → contenedor api
  │
  └─ NestJS (ConfigModule)
        • validateEnv() comprueba que existan DATABASE_*
        • TypeORM usa database.host / user / password / …
```

## Diccionario de variables (Multicine)

### App Nest

| Variable | Ejemplo | Significado |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente: development / qa / production / test |
| `PORT` | `3000` | Puerto HTTP de la API |

### Postgres (creación del contenedor `db`)

| Variable | Ejemplo | Significado |
|---|---|---|
| `POSTGRES_USER` | `multicine` | Usuario admin inicial de Postgres |
| `POSTGRES_PASSWORD` | `change_me` | Contraseña (cámbiala en tu `.env`) |
| `POSTGRES_DB` | `multicine_db` | Nombre de la base creada al primer arranque |

### Postgres (conexión desde la API / TypeORM)

| Variable | Ejemplo | Significado |
|---|---|---|
| `DATABASE_HOST` | `db` | Host visto **desde el contenedor api**. En Compose = nombre del servicio |
| `DATABASE_PORT` | `5432` | Puerto interno de Postgres |
| `DATABASE_USER` | `multicine` | Usuario con el que Nest se conecta |
| `DATABASE_PASSWORD` | `change_me` | Debe coincidir con `POSTGRES_PASSWORD` |
| `DATABASE_NAME` | `multicine_db` | Debe coincidir con `POSTGRES_DB` |
| `DATABASE_SYNC` | `true` (opcional) | Si TypeORM altera el esquema solo (dev) |

## El detalle que más confunde: `DATABASE_HOST`

| Cómo corres la API | Valor correcto de `DATABASE_HOST` |
|---|---|
| API **dentro** de Docker Compose | `db` |
| API en tu PC + Postgres en Docker | `localhost` |

`localhost` dentro del contenedor `api` **no** es tu PC ni el contenedor `db`.

## Entrada / salida conceptual

| Entrada | Salida |
|---|---|
| Claves `NOMBRE=valor` en texto | `process.env.NOMBRE` disponible en Node / Compose |
| Si falta una var obligatoria | Nest **no arranca** (`validateEnv` lanza error) |

## Buenas prácticas (práctica profesional)

1. Copia `.env.example` → `.env` y nunca subas `.env`.
2. Usa la misma contraseña en `POSTGRES_*` y `DATABASE_*` al inicio.
3. En producción: secretos desde el proveedor (GitHub Actions secrets, Vault, etc.), no archivos en el repo.
4. Si cambias `POSTGRES_PASSWORD` **después** de crear el volumen, Postgres **no** lo actualiza solo: hay que recrear el volumen (`docker compose down -v`) o alterar el usuario a mano.
