/**
 * Repositorio de dispositivos: guarda y quita en Supabase el token de Expo Push de este teléfono (issue #7).
 *
 * Qué hace: concentra lo que la app hace con la tabla `dispositivos`, para que los hooks y las pantallas no
 * hablen con Supabase directamente (RNF7). Esa tabla es la que leen las Edge Functions (`validar-pase`,
 * `notificar-alerta`, `notificar-incidencia`) para saber a qué teléfonos mandar una push.
 * - `registrarDispositivo`: llama a la función SQL `registrar_dispositivo`, que guarda el token a nombre de
 *   quien tiene sesión y, si el mismo teléfono cambió de cuenta, lo mueve a la cuenta nueva.
 * - `quitarDispositivo`: borra el token de una fila propia (RLS no deja borrar las ajenas).
 * - `quitarDispositivoDeEsteTelefono`: lo que se hace al cerrar sesión; es de mejor esfuerzo y no espera
 *   más de unos segundos, para que cerrar sesión sin conexión no se quede colgado.
 * Se usa con: `src/hooks/useRegistroDeDispositivo.ts` (registra) y `src/contexto/SesionContext.tsx`
 * (quita al cerrar sesión).
 * Depende de: `src/lib/supabase.ts`, `src/servicios/notificaciones.ts` (token en memoria) y de la migración
 * `supabase/migrations/20261125000001_registrar_dispositivo.sql`.
 */
import { supabase } from '@/lib/supabase';
import { olvidarToken, tokenGuardado } from '@/servicios/notificaciones';
import type { Database } from '@/tipos/base_de_datos';

/** Plataforma del teléfono: viene del enumerado `plataforma_dispositivo` (`android` o `ios`). */
export type PlataformaDispositivo = Database['public']['Enums']['plataforma_dispositivo'];

/** Segundos máximos que se espera al quitar el token al cerrar sesión antes de seguir de todos modos. */
const ESPERA_MAXIMA_MS = 4000;

/**
 * Guarda el token de este teléfono a nombre del usuario con sesión.
 *
 * @param token token de Expo Push (`ExponentPushToken[...]`).
 * @param plataforma `android` o `ios`.
 * @throws el error de Supabase si la función lo rechaza (token inválido, perfil inactivo o sin conexión).
 */
export async function registrarDispositivo(
  token: string,
  plataforma: PlataformaDispositivo,
): Promise<void> {
  const { error } = await supabase.rpc('registrar_dispositivo', {
    p_token: token,
    p_plataforma: plataforma,
  });
  if (error) throw error;
}

/**
 * Borra de la base el token indicado, si es del usuario con sesión.
 *
 * @param token token de Expo Push que se quiere quitar.
 * @throws el error de Supabase si la consulta falla.
 */
export async function quitarDispositivo(token: string): Promise<void> {
  const { error } = await supabase.from('dispositivos').delete().eq('expo_push_token', token);
  if (error) throw error;
}

/**
 * Quita el token de este teléfono al cerrar sesión, para que el teléfono deje de recibir las push de esa
 * cuenta. Debe llamarse ANTES de cerrar la sesión de Supabase: después ya no hay permiso para borrar.
 *
 * Es de mejor esfuerzo: si no hay token, no hay conexión o tarda más de unos segundos, sigue sin lanzar
 * error. Si el token no se pudo quitar, la próxima cuenta que inicie sesión en este teléfono lo recibe
 * igual, porque `registrar_dispositivo` mueve el token a la cuenta nueva.
 */
export async function quitarDispositivoDeEsteTelefono(): Promise<void> {
  const token = tokenGuardado();
  if (!token) return;
  try {
    await Promise.race([
      quitarDispositivo(token),
      new Promise<void>((resolver) => setTimeout(resolver, ESPERA_MAXIMA_MS)),
    ]);
  } catch (error) {
    console.warn('No se pudo quitar el token de notificaciones al cerrar sesión', error);
  } finally {
    olvidarToken();
  }
}
