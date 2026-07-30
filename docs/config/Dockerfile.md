# `backend/Dockerfile`

## ¿Qué es?

Un **Dockerfile** es una lista de instrucciones que Docker ejecuta **en orden**
para construir una **imagen**. La imagen es una “foto” del sistema de archivos
+ el comando que debe correr el contenedor.

Analogía: el Dockerfile es la **receta**; la imagen es el **plato ya cocinado**;
el contenedor es **servir el plato** (puedes servir varias copias de la misma receta).

## ¿Por qué existe en este proyecto?

La HU-001 exige que la API arranque con Docker. Sin Dockerfile, Compose no sabría
cómo empaquetar NestJS + sus dependencias de forma repetible en cualquier PC.

## Qué hace cada instrucción (versión Multicine)

| Instrucción | Qué hace | Por qué |
|---|---|---|
| `FROM node:22-alpine` | Parte de una imagen oficial con Node 22 | No instalamos Node a mano; Alpine es liviana |
| `WORKDIR /app` | Entra / crea `/app` como carpeta de trabajo | Todos los `COPY`/`RUN` siguientes ocurren ahí |
| `COPY package*.json ./` | Copia solo manifests de npm | Permite cachear `npm install` si el código cambia pero las deps no |
| `RUN npm install` | Instala dependencias dentro de la imagen | El contenedor trae `node_modules` propio |
| `COPY . .` | Copia el código fuente | Ya con deps listas |
| `EXPOSE 3000` | Documenta el puerto | No publica el puerto; eso lo hace Compose |
| `CMD ["npm", "run", "start:dev"]` | Proceso principal del contenedor | En práctica usamos watch (`start:dev`) |

## Relación con otros archivos

- **`.dockerignore`**: archivos que NO se mandan al contexto de build (`node_modules`, `.git`, …).
- **`docker-compose.yml`**: usa este Dockerfile en el servicio `api` y publica el puerto 3000.

## Comandos útiles

```bash
# Solo construir la imagen de la API
docker build -t multicine-api ./backend

# Lo habitual en este repo (API + DB)
docker compose up --build
```

## Nota de aprendizaje

En **producción** normalmente no usarías `start:dev`, sino un Dockerfile
multi-stage: `npm run build` → `node dist/main`. En práctica/dev, `start:dev`
facilita ver cambios al instante gracias al volume de Compose.
