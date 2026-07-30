# `backend/.prettierrc`

## ¿Qué es?

**Prettier** es un formateador de código: reescribe el estilo (comillas, comas,
saltos de línea, etc.) de forma **automática y consistente**.

No busca bugs (eso es ESLint). Solo se preocupa de “cómo se ve” el código.

## ¿Por qué existe en este proyecto?

La HU-001 pide Prettier. En un equipo (o en práctica con revisiones) evita debates
del tipo “¿comillas simples o dobles?”. El archivo fija las reglas del repo.

> Este archivo es JSON puro: **no admite comentarios dentro**.
> Por eso la explicación vive aquí en `docs/config/`.

## Contenido actual

```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

| Opción | Valor | Efecto |
|---|---|---|
| `singleQuote` | `true` | Prefiere `'hola'` en vez de `"hola"` en JS/TS |
| `trailingComma` | `"all"` | Deja coma final en objetos/arrays/params cuando es válido en JS moderno |

Ejemplo con `trailingComma: "all"`:

```ts
const movie = {
  title: 'Dune',
  year: 2021, // ← esta coma final está permitida y tipada por Prettier
};
```

## Cómo se relaciona con ESLint

En `eslint.config.mjs` está el plugin `eslint-plugin-prettier`.
Eso significa: **si el código no está formateado como Prettier, ESLint marca error**.

Flujo típico:

```text
guardas un archivo
  → Prettier formatea (editor / pre-commit / npm run format)
  → ESLint valida reglas + que Prettier esté contento
```

## Comandos útiles

```bash
cd backend
npm run format          # formatea src/ y test/
npx prettier --check .  # solo verifica, no escribe
```

## Tip de editor

En Cursor/VS Code: extensión Prettier + setting

```json
"editor.formatOnSave": true
```

Así cada guardado aplica `.prettierrc` sin pensar.
