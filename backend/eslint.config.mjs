// =============================================================================
// ESLint — reglas de calidad de código (errores antes de producción)
// =============================================================================
// ¿Qué es?
//   Analizador estático: encuentra bugs, malas prácticas y estilo inconsistente
//   SIN ejecutar la app.
//
// ¿Por qué existe?
//   HU-001 pide ESLint. En un proyecto de práctica evita que cada persona
//   escriba TypeScript de forma distinta (y atrapa errores tontos pronto).
//
// Guía detallada: docs/config/eslint.config.md
// =============================================================================

// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Configuración "flat" de ESLint (formato moderno, ESLint 9+).
 *
 * @returns {import('typescript-eslint').ConfigArray} Lista de bloques de reglas
 *          que ESLint fusiona de arriba hacia abajo.
 */
export default tseslint.config(
  {
    // No lintear este propio archivo de configuración.
    ignores: ['eslint.config.mjs'],
  },
  // Reglas recomendadas de JavaScript.
  eslint.configs.recommended,
  // Reglas TypeScript CON type-check (usa el tsconfig del proyecto).
  ...tseslint.configs.recommendedTypeChecked,
  // Integra Prettier: si el formato no cumple Prettier, ESLint marca error.
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        // APIs de Node (process, __dirname, …) no son “variables indefinidas”.
        ...globals.node,
        // APIs de Jest (describe, it, expect, …).
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        // Activa análisis tipado usando el/los tsconfig del repo.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // En aprendizaje a veces se usa `any`; lo dejamos apagado.
      '@typescript-eslint/no-explicit-any': 'off',
      // Avisa si olvidaste await/catch en una Promise.
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Prettier manda el formato; endOfLine auto evita conflictos Windows/Linux.
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
