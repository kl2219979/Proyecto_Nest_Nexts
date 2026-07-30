# `backend/tsconfig.json`

## ¿Qué es?

**TypeScript Compiler Options**: le dice a `tsc` (y al language service del editor)
cómo entender y transpilar tu código `.ts`.

No ejecuta la API. Solo define reglas de **tipos** y de **emisión de JavaScript**.

## ¿Por qué existe en este proyecto?

1. Nest usa **decoradores** (`@Controller`, `@Injectable`, …). Eso requiere:
   - `experimentalDecorators`
   - `emitDecoratorMetadata` (TypeORM/Nest lean metadatos en runtime)
2. Uniforma el target (`ES2023`) y la carpeta de salida (`dist`).
3. El IDE (Cursor) usa este archivo para marcar errores mientras escribes.

## Opciones clave (traducidas a humano)

| Opción | Para qué sirve aquí |
|---|---|
| `module` / `moduleResolution: nodenext` | Alineado con Node moderno y `package.json` exports |
| `emitDecoratorMetadata` + `experimentalDecorators` | Nest + TypeORM funcionan con decoradores |
| `outDir: ./dist` | JS compilado sale a `dist/` |
| `sourceMap: true` | Puedes depurar viendo el TS original |
| `strictNullChecks: true` | Obliga a pensar en `null`/`undefined` |
| `skipLibCheck: true` | No type-checkea toda `node_modules` (más rápido) |
| `removeComments: true` | Los comentarios/JSDoc **no** van al JS final (sí ayudan en el TS) |

## Entrada / salida

| Entrada | Salida |
|---|---|
| Archivos `.ts` | (en build) `.js` + `.js.map` + `.d.ts` en `dist/` |
| Errores de tipos | Diagnósticos en el editor / fallo de `tsc` |

## Relación con `tsconfig.build.json`

```text
tsconfig.json          →  día a día (IDE, reglas base)
tsconfig.build.json    →  hereda lo anterior, pero EXCLUYE tests al empaquetar
```

Si cambias una `compilerOption` importante, casi siempre va en `tsconfig.json`
para que el build (que hace `extends`) la herede.
