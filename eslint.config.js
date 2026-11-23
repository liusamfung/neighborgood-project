/**
 * Configuración de ESLint del proyecto (`npx expo lint`, parte de la comprobación antes de cerrar una tarea).
 * Usa las reglas recomendadas de Expo y excluye la carpeta `dist` y el código Deno de las Edge Functions.
 * Además impone la arquitectura en capas (RNF7): fuera de la capa de acceso a datos nadie importa el
 * cliente de Supabase, así que si una pantalla lo intenta, el lint falla.
 * Se usa con: `package.json` (script `lint`) y `eslint-config-expo`.
 */
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/** Motivo que muestra el lint cuando alguien importa Supabase en una capa que no le corresponde. */
const MOTIVO_RNF7 =
  'RNF7: solo src/repositorios y src/lib hablan con Supabase. Llama a un repositorio (o a su hook).';

module.exports = defineConfig([
  expoConfig, // reglas base de Expo y React Native
  {
    // supabase/functions es código Deno: lo revisa denols, no este eslint.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
  {
    // RNF7: presentación, lógica y servicios del dispositivo no usan supabase-js directamente.
    // Quedan fuera src/repositorios y src/lib (la capa de acceso a datos) y src/contexto, que solo
    // importa el tipo `Session` (desaparece al compilar).
    files: [
      'src/app/**',
      'src/componentes/**',
      'src/hooks/**',
      'src/servicios/**',
      'src/utilidades/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/supabase', message: MOTIVO_RNF7 },
            { name: '@supabase/supabase-js', message: MOTIVO_RNF7 },
          ],
        },
      ],
    },
  },
]);
