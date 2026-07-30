# `backend/nest-cli.json`

## ¿Qué es?

Configuración de **`@nestjs/cli`**, la herramienta de línea de comandos de Nest:

- `nest start` / `nest start --watch`
- `nest build`
- `nest g module movies` (generadores)

## ¿Por qué existe en este proyecto?

Nest no es “solo TypeScript”: el CLI necesita saber **dónde está el código**
(`sourceRoot`) y **cómo limpiar el build**. Sin este archivo, los generadores
y el build usan defaults que pueden no coincidir con tu estructura.

> **Importante:** `nest-cli.json` se parsea con `JSON.parse` estricto.
> **No admite comentarios** dentro del archivo. Toda la explicación educativa
> está en esta guía (y no dentro del JSON).

## Campos que usamos

| Campo | Valor | Significado |
|---|---|---|
| `$schema` | URL de JSON Schema | Autocompletado y validación en el editor |
| `collection` | `@nestjs/schematics` | Plantillas oficiales al generar módulos/controllers |
| `sourceRoot` | `src` | Raíz del código de la aplicación |
| `compilerOptions.deleteOutDir` | `true` | Borra `dist/` antes de cada build |

## Entrada / salida conceptual

| Comando | Entrada | Salida |
|---|---|---|
| `nest build` | `src/**/*.ts` (vía tsconfig.build) | JS en `dist/` |
| `nest g resource films` | nombre + prompts | archivos nuevos bajo `src/` |

## Relación con otros archivos

```text
nest-cli.json  →  decide sourceRoot y limpieza de dist
tsconfig.build.json  →  decide qué TS se compila al hacer build
package.json scripts  →  "build": "nest build", "start:dev": "nest start --watch"
```

## Tip de aprendizaje

Cuando ejecutas:

```bash
npx nest g module health
```

el CLI mira `collection` + `sourceRoot` y crea `src/health/health.module.ts`
con la estructura Nest estándar.
