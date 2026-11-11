/**
 * Edge Function `crear-pase`: crea un pase de visita para el residente que llama (RF15).
 *
 * Qué hace: recibe el nombre del invitado, la fecha y la hora estimada, y guarda un pase `vigente`
 * asociado a la unidad del residente. Postgres genera el código del pase (UUID v4, RF16).
 * Cómo funciona: `withSupabase({ auth: 'user' })` (paquete oficial `@supabase/server`) exige un token de
 * usuario válido y entrega el contexto con el cliente del llamador y el cliente administrador
 * (`supabaseAdmin`, con la `service_role`). Se usa el administrador porque el residente no tiene permiso
 * de insertar en `pases_visita` (migración 5): solo esta función decide qué se guarda. La lógica vive en
 * `manejador.ts` para poder probarla sin levantar un servidor.
 * Se usa con: la app (`src/repositorios/pases.ts` → `crearPase()`), `_compartido/perfil.ts` y la
 * configuración `[functions.crear-pase]` de `supabase/config.toml`.
 */
// Tipos de las APIs propias del entorno de Supabase Edge Functions.
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { manejar } from './manejador.ts'

export default {
  // `errors.detailed: false` quita las pistas de depuración de los errores de autenticación.
  fetch: withSupabase({ auth: 'user', errors: { detailed: false } }, manejar),
}
