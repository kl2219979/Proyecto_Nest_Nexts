# HU-002 — Selección de País, Departamento y Ciudad (Backend)

## Qué resuelve

Antes de mostrar la cartelera, el visitante elige **dónde** está:

```text
País → Departamento → Ciudad → (cines activos de esa ciudad)
```

En el backend eso se traduce a endpoints REST + tablas en PostgreSQL.

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/countries` | Lista países |
| `GET` | `/departments/:countryId` | Departamentos del país |
| `GET` | `/cities/:departmentId` | Ciudades **elegibles** (RN-006) |
| `POST` | `/users/location` | Valida ciudad y devuelve contexto + cines |

Swagger: http://localhost:3000/api/docs → tag **Locations**

## Regla RN-006 (importante)

Una ciudad solo aparece en `GET /cities/:departmentId` si:

1. `city.isActive === true`
2. Existe al menos un `cinema` con `isActive === true` en esa ciudad

El seed incluye **Guatapé** (sin cines) y **Yumbo** (inactiva) para que puedas comprobar el filtro.

## Qué hace / no hace el backend hoy

| Sí | No (aún) |
|---|---|
| Catalogar geografía + cines | Guardar en Local Storage (eso es frontend) |
| Validar `cityId` en POST | Autenticar usuario (HU-006/007) |
| Sembrar Colombia al primer arranque | Próximos estrenos (HU-005) |

`POST /users/location` **no** crea un usuario. Devuelve un JSON listo para que el frontend lo guarde en Local Storage (RN-008).

## Archivos clave

```text
backend/src/locations/
  entities/          → tablas TypeORM
  dto/               → validación del body POST
  locations.service.ts
  locations.controller.ts
  users-location.controller.ts
  locations.seed.ts  → datos demo
  locations.module.ts
```

## Cómo probar con Docker

```bash
docker compose up --build

# 1) Países
curl http://localhost:3000/api/v1/countries

# 2) Copia el id de Colombia y pide departamentos
curl http://localhost:3000/api/v1/departments/<countryId>

# 3) Copia un departmentId (ej. Antioquia) y pide ciudades
curl http://localhost:3000/api/v1/cities/<departmentId>
# No deberías ver Guatapé

# 4) Guarda preferencia
curl -X POST http://localhost:3000/api/v1/users/location \
  -H 'Content-Type: application/json' \
  -d '{"cityId":"<uuid-de-medellin>"}'
```

## Modelo mental

```text
Controller  → recibe HTTP, valida params/body
Service     → reglas de negocio (RN-006)
Repository  → SQL vía TypeORM
PostgreSQL  → countries / departments / cities / cinemas
```
