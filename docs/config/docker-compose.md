# `docker-compose.yml`

## ¿Qué es?

**Docker Compose** describe una aplicación hecha de **varios contenedores**
(servicios) y cómo se conectan: red, puertos, variables, volúmenes y orden de arranque.

Un solo comando levanta todo el entorno:

```bash
docker compose up --build
```

## ¿Por qué existe en este proyecto?

Necesitas **dos contenedores separados**:

1. `db` → PostgreSQL  
2. `api` → NestJS  

Compose los pone en la **misma red Docker** para que la API hable con Postgres
usando el hostname `db` (el nombre del servicio), no `localhost`.

> Dentro del contenedor `api`, `localhost` sería el propio contenedor de la API,
> no la base de datos. Ese es el error #1 más común al empezar con Docker.

## Anatomía del archivo Multicine

### Servicio `db`

| Clave | Significado |
|---|---|
| `image: postgres:16-alpine` | Usa imagen oficial; no construimos Postgres nosotros |
| `environment` | Usuario, password y nombre de DB iniciales |
| `ports: 5432:5432` | Acceso desde tu PC (DBeaver, psql, etc.) |
| `volumes: postgres_data` | Persiste datos aunque borres el contenedor |
| `healthcheck` | Compose sabe cuándo Postgres ya acepta conexiones |

### Servicio `api`

| Clave | Significado |
|---|---|
| `build.context: ./backend` | Construye con el Dockerfile del backend |
| `env_file: .env` | Carga secretos/config desde la raíz |
| `environment.DATABASE_HOST: db` | Host correcto **dentro** de la red Compose |
| `volumes: ./backend:/app` | Tu código local se refleja en el contenedor (hot reload) |
| `/app/node_modules` (volumen anónimo) | Evita que el mount pise los módulos de la imagen |
| `depends_on: service_healthy` | La API espera a que `db` esté sana |

### `volumes` (nivel raíz)

Declara volúmenes nombrados del proyecto. `postgres_data` sobrevive a
`docker compose down` (salvo que uses `-v`).

## Flujo al hacer `docker compose up --build`

```text
1. Lee .env
2. Construye imagen de `api` (Dockerfile)
3. Crea/arranca contenedor `db`
4. Espera healthcheck OK
5. Arranca contenedor `api` → Nest en :3000
6. Tú pruebas: http://localhost:3000/api/v1/health
```

## Comandos útiles

```bash
docker compose up --build      # primer plano (ves logs)
docker compose up --build -d   # segundo plano
docker compose logs -f api     # seguir logs de la API
docker compose down            # apagar (conserva datos de Postgres)
docker compose down -v         # apagar Y borrar volúmenes (¡borra la DB!)
```
