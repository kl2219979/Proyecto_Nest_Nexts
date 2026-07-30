# `backend/.dockerignore`

## ¿Qué es?

Lista de rutas que Docker **excluye del contexto de build** cuando construye
la imagen de la API (`docker build` / servicio `api` en Compose).

Antes de ejecutar el Dockerfile, Docker empaqueta la carpeta contexto
(`./backend`) y se la envía al daemon. `.dockerignore` decide qué **no** va
en ese paquete.

## ¿Por qué existe en este proyecto?

Sin él pasarían cosas malas o ineficientes:

1. **`node_modules` del host** entraría a la imagen (puede ser incompatible
   con Linux Alpine del contenedor).
2. **`.env` con secretos** podría copiarse a capas de la imagen (riesgo de seguridad).
3. Builds **lentos y pesados** por meter `dist`, coverage, `.git`, markdown, logs.

Analogía rápida:

| Archivo | Mundo | Pregunta que responde |
|---|---|---|
| `.gitignore` | Git | ¿Qué no versiono? |
| `.dockerignore` | Docker build | ¿Qué no mando al construir la imagen? |

No son el mismo archivo: algo puede estar en Git y aun así ignorarse en el build
(por ejemplo `*.md` de documentación).

## Qué ignoramos y por qué

| Patrón | Motivo |
|---|---|
| `node_modules` | Se reinstala con `RUN npm install` en el Dockerfile |
| `dist` | Se regenera con `nest build` cuando haga falta |
| `coverage` | Solo sirve para reportes de tests locales |
| `.git` / `.gitignore` | Metadatos de Git; no ejecutan la API |
| `*.md` | Docs; no necesarias en runtime |
| `.env` / `.env.*` | Secretos; la config llega por Compose (`env_file` / `environment`) |
| `*.log` / `.DS_Store` | Ruido local |

## Relación con el Dockerfile

```text
docker compose build api
  → contexto = ./backend
  → aplica .dockerignore  (recorta el contexto)
  → ejecuta Dockerfile:
        COPY package*.json ./
        RUN npm install
        COPY . .          ← aquí YA no vienen node_modules/.env ignorados
```

Si `.env` **no** estuviera en `.dockerignore` y el Dockerfile hiciera `COPY . .`,
los secretos podrían quedar grabados en una capa de la imagen.

## Entrada / salida conceptual

| Entrada | Salida |
|---|---|
| Carpeta `backend/` en tu disco | Contexto filtrado que recibe `docker build` |
| Patrones de `.dockerignore` | Archivos omitidos (no existen para los `COPY`) |

## Cómo comprobar qué se está ignorando

No hay un comando único perfecto en todos los entornos, pero puedes:

1. Revisar el tamaño del contexto en los logs de `docker compose build`.
2. Asegurarte de que tras el build, la imagen no dependa de copiar tu `.env`
   (en Multicine la API recibe env por Compose).

## Tip de aprendizaje

Si cambias `.dockerignore` y “de pronto falta un archivo dentro del contenedor”,
revisa si lo acabas de añadir a la lista de exclusión. El síntoma típico es:

```text
Error: Cannot find module ...
o un archivo de config que “existe en el repo” pero no dentro de la imagen
```
