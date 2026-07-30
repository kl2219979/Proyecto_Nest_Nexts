# `backend/eslint.config.mjs`

## ¿Qué es?

**ESLint** analiza el código en busca de problemas: variables sin usar,
promesas sin `await`, tipos inseguros, estilo que choca con Prettier, etc.

El archivo `eslint.config.mjs` usa el formato **flat config** (ESLint 9+):
exporta un array de objetos de configuración en vez del viejo `.eslintrc`.

## ¿Por qué existe en este proyecto?

HU-001 exige ESLint. Además, TypeScript solo ayuda en compile-time; ESLint
puede avisarte de patrones peligrosos mientras escribes (y en CI).

## Bloques importantes de nuestra config

1. **`ignores`**: no lintar el propio `eslint.config.mjs`.
2. **`eslint.configs.recommended`**: reglas JS básicas.
3. **`typescript-eslint` recommendedTypeChecked**: reglas TS que usan el type checker.
4. **`eslintPluginPrettierRecommended`**: integra Prettier como regla ESLint.
5. **`languageOptions.globals`**: declara que existen `process`, `describe`, `expect`, …
6. **`rules`**: ajustes del equipo (ej. apagar `no-explicit-any` mientras aprendes).

## ¿Qué espera / qué “retorna”?

No es una función de negocio, pero conceptualmente:

| Entrada | Salida |
|---|---|
| Archivos `.ts` del proyecto | Reporte de errores/warnings (exit code ≠ 0 si hay errores) |

## Comandos útiles

```bash
cd backend
npm run lint                 # ejecuta ESLint y aplica --fix cuando puede
npx eslint "src/**/*.ts"     # lint manual de una carpeta
```

## Diferencia ESLint vs TypeScript vs Prettier

| Herramienta | Pregunta que responde |
|---|---|
| TypeScript (`tsc`) | ¿Los tipos cuadran? |
| ESLint | ¿Hay malas prácticas / bugs probables / estilo de equipo? |
| Prettier | ¿El formato visual es uniforme? |
