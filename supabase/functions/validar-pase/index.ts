/**
 * Edge Function `validar-pase`: el guardia valida el ingreso de una visita y registra su salida
 * (RF18 a RF21).
 *
 * Qué hace: recibe el código del QR y la acción (`ingreso` o `salida`) y responde con el resultado y
 * los datos del pase, o con el motivo del rechazo ("Pase ya usado", "Pase anulado"...).
 * Cómo funciona: `withSupabase({ auth: 'user' })` exige un token de usuario válido y entrega el
 * contexto (cliente del llamador y cliente administrador). La lógica vive en `manejador.ts` para poder
 * probarla sin servidor.
 * Se usa con: la app (`src/repositorios/pases.ts` → `validarPase` y `registrarSalida`) y la
 * configuración `[functions.validar-pase]` de `supabase/config.toml`.
 */
// Tipos de las APIs propias del entorno de Supabase Edge Functions.
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { manejar } from './manejador.ts'

export default {
  // `errors.detailed: false` quita las pistas de depuración de los errores de autenticación.
  fetch: withSupabase({ auth: 'user', errors: { detailed: false } }, manejar),
}
