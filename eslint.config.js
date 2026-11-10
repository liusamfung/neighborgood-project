/**
 * Configuración de ESLint del proyecto (`npx expo lint`, parte de la comprobación antes de cerrar una tarea).
 * Usa las reglas recomendadas de Expo y excluye la carpeta `dist` y el código Deno de las Edge Functions.
 * Se usa con: `package.json` (script `lint`) y `eslint-config-expo`.
 */
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig, // reglas base de Expo y React Native
  {
    // supabase/functions es código Deno: lo revisa denols, no este eslint.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
