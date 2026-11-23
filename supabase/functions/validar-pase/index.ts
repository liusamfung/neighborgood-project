/**
 * Edge Function `validar-pase`: el guardia escanea el QR de un pase y la función responde si la visita
 * puede ingresar y, si puede, marca el pase como usado (RF18, RF19).
 *
 * Qué hace: recibe el código leído del QR (el `id` del pase), registra el ingreso y contesta "Pase
 * válido" con el visitante y la unidad, o el motivo del rechazo ("Pase no válido o vencido", "Pase ya usado", "Pase anulado").
 * Cómo funciona: `withSupabase({ auth: 'user' })` (paquete oficial `@supabase/server`) exige un token de
 * usuario válido y entrega el contexto con el cliente del llamador y el cliente administrador
 * (`supabaseAdmin`, con la `service_role` que inyecta Supabase). La lógica vive en `manejador.ts` para
 * poder probarla sin levantar un servidor.
 * Se usa con: la app (`src/repositorios/validacionPases.ts` → `validarPase()`), `_compartido/perfil.ts`
 * y la configuración `[functions.validar-pase]` de `supabase/config.toml`.
 */
// Tipos de las APIs propias del entorno de Supabase Edge Functions.
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { manejar } from './manejador.ts'

export default {
  // `errors.detailed: false` quita las pistas de depuración de los errores de autenticación.
  fetch: withSupabase({ auth: 'user', errors: { detailed: false } }, manejar),
}
