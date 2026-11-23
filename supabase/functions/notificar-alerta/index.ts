/**
 * Edge Function `notificar-alerta`: difunde por push una alerta de pánico recién creada a los vecinos de su
 * sector, a la directiva y a los guardias (RF25).
 *
 * Qué hace: recibe `{ alerta_id }` del residente que acaba de emitir la alerta (RF23) y manda el push a los
 * teléfonos registrados de quienes deben enterarse. Con la app abierta, esas personas ya la reciben por
 * Realtime; el push cubre a los que la tienen cerrada (diagrama 4.2).
 * Cómo funciona: `withSupabase({ auth: 'user' })` (paquete oficial `@supabase/server`) exige un token de
 * usuario válido y entrega el cliente del llamador y el cliente administrador (`supabaseAdmin`, con la
 * `service_role` que inyecta Supabase). La lógica vive en `manejador.ts` para probarla sin servidor.
 * Se usa con: la app (`src/repositorios/difusionAlertas.ts` → `difundirAlerta()`), `_compartido/push.ts`
 * y la configuración `[functions.notificar-alerta]` de `supabase/config.toml`.
 */
// Tipos de las APIs propias del entorno de Supabase Edge Functions.
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { manejar } from './manejador.ts'

export default {
  // `errors.detailed: false` quita las pistas de depuración de los errores de autenticación.
  fetch: withSupabase({ auth: 'user', errors: { detailed: false } }, manejar),
}
