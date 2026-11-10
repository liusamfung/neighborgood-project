/**
 * Edge Function `quien-soy`: devuelve quién es el usuario que llama (id, correo, rol y unidad).
 *
 * Qué hace: es la función de ejemplo del issue #6. Sirve para probar de punta a punta que la app
 * autenticada llega a una Edge Function desplegada, y es la plantilla de las funciones reales
 * (crear pase, validar ingreso: RF15 a RF22).
 * Cómo funciona: `withSupabase({ auth: 'user' })` (paquete oficial `@supabase/server`) exige un token de
 * usuario válido y entrega el contexto con el cliente de Supabase del llamador. La lógica vive en
 * `manejador.ts` para poder probarla sin levantar un servidor.
 * Se usa con: la app (`src/repositorios/funciones.ts` → `quienSoy()`), `_compartido/perfil.ts` y la
 * configuración `[functions.quien-soy]` de `supabase/config.toml`.
 */
// Tipos de las APIs propias del entorno de Supabase Edge Functions.
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { manejar } from './manejador.ts'

export default {
  // `errors.detailed: false` quita las pistas de depuración de los errores de autenticación.
  fetch: withSupabase({ auth: 'user', errors: { detailed: false } }, manejar),
}
