// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions es código Deno: lo revisa denols, no este eslint.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
