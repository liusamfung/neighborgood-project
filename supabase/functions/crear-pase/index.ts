/**
 * Edge Function `crear-pase`: el residente crea un pase de visita con su código QR (RF15, RF16).
 *
 * Qué hace: recibe el nombre del visitante, la fecha y la hora estimada, y responde con el pase creado;
 * su `id` es el UUID que la app dibuja como QR.
 * Cómo funciona: `withSupabase({ auth: 'user' })` exige un token de usuario válido y entrega el
 * contexto (cliente del llamador y cliente administrador). La lógica vive en `manejador.ts` para poder
 * probarla sin servidor.
 * Se usa con: la app (`src/repositorios/pases.ts` → `crearPase`) y la configuración
 * `[functions.crear-pase]` de `supabase/config.toml`.
 */
// Tipos de las APIs propias del entorno de Supabase Edge Functions.
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { manejar } from './manejador.ts'

export default {
  // `errors.detailed: false` quita las pistas de depuración de los errores de autenticación.
  fetch: withSupabase({ auth: 'user', errors: { detailed: false } }, manejar),
}
