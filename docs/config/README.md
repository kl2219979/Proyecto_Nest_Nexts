# Documentación de archivos de configuración — Multicine

Este directorio explica, uno por uno, los archivos de tooling y entorno que suelen
confundir la primera vez. Léelos junto al archivo real del repo.

| Archivo real | Guía |
|---|---|
| `backend/Dockerfile` | [Dockerfile.md](./Dockerfile.md) |
| `docker-compose.yml` | [docker-compose.md](./docker-compose.md) |
| `backend/.dockerignore` | [dockerignore.md](./dockerignore.md) |
| `.env.example` (y `.env`) | [env.example.md](./env.example.md) |
| `backend/.prettierrc` | [prettierrc.md](./prettierrc.md) |
| `backend/eslint.config.mjs` | [eslint.config.md](./eslint.config.md) |
| `backend/nest-cli.json` | [nest-cli.md](./nest-cli.md) |
| `backend/tsconfig.json` | [tsconfig.md](./tsconfig.md) |
| `backend/tsconfig.build.json` | [tsconfig.build.md](./tsconfig.build.md) |

## Mapa mental rápido

```text
Código TypeScript (src/)
        │
        ├─ ESLint ────────── calidad / posibles bugs
        ├─ Prettier ──────── formato visual (comillas, comas, …)
        ├─ tsconfig*.json ── cómo se compila TS → JS
        ├─ nest-cli.json ─── cómo Nest construye y genera código
        │
Entorno
        ├─ .env.example ──── plantilla versionada (sin secretos)
        └─ .env ──────────── valores reales (NO va a Git)
        │
Docker
        ├─ Dockerfile ────── receta de LA imagen de la API
        ├─ .dockerignore ─── qué NO entra al build de esa imagen
        └─ docker-compose ── API + Postgres juntos
```
