# `backend/tsconfig.build.json`

## ¿Qué es?

Una **configuración TypeScript especializada para el build** de la API
(`nest build` / compilación hacia `dist/`).

Es corta a propósito: **hereda** casi todo de `tsconfig.json` y solo cambia
qué archivos **excluir**.

## ¿Por qué existe en este proyecto?

Porque no quieres que el artefacto desplegable incluya:

- tests (`test/`, `*.spec.ts`)
- `node_modules`
- la propia carpeta `dist`

El IDE sí necesita ver los tests (para autocompletado y tipos).
El build de producción/práctica empaquetada, no.

## Contenido explicado

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

| Campo | Significado |
|---|---|
| `extends` | “Copia todas las `compilerOptions` de `tsconfig.json`” |
| `exclude` | “Aunque existan, no los compiles en este build” |

## Entrada / salida

| Entrada | Salida |
|---|---|
| `src/**/*.ts` (sin specs) | `dist/**/*.js` listo para `node dist/main` |
| Specs / e2e | **No** se emiten a `dist/` |

## Flujo con Nest CLI

```text
npm run build
  → nest build
  → usa nest-cli.json (deleteOutDir, sourceRoot)
  → compila con tsconfig.build.json
  → genera dist/
```

## Tip de aprendizaje

Si creas `movies.service.spec.ts` y haces `nest build`, ese spec **no** debería
aparecer en `dist/`. Si aparece, revisa el `exclude` de este archivo.
