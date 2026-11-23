/**
 * Repositorio de la difusión de alertas (RF25): avisa una alerta recién creada a quien debe enterarse.
 *
 * Qué hace:
 * - `difundirAlerta`: le pide a la Edge Function `notificar-alerta` que mande el push a los vecinos del
 *   sector, a la directiva y a los guardias que tienen la app cerrada.
 * - `escucharAlertasNuevas`: abre un canal de Realtime sobre `alertas` y avisa cada alerta nueva, para
 *   quienes tienen la app abierta (diagrama 4.2).
 * Cómo funciona: Realtime respeta RLS (política "alertas: lectura"), así que cada uno recibe solo lo que
 * puede ver: el personal, todas; un residente, las de su sector. La tabla ya está publicada en
 * `supabase_realtime` desde la migración 5. Las pantallas no hablan con Supabase directamente (RNF7).
 * Se usa con: `src/hooks/useEmitirAlerta.ts` (difundir) y `src/hooks/useAvisoDeAlertas.ts` (escuchar).
 * Depende de: `src/lib/supabase.ts`, `src/repositorios/funciones.ts` y `supabase/functions/notificar-alerta`.
 */
import { supabase } from '@/lib/supabase';
import { invocarFuncion } from '@/repositorios/funciones';
import type { Tables } from '@/tipos/base_de_datos';

/**
 * Pide el push de una alerta recién emitida. Es de mejor esfuerzo: nunca lanza error, porque la alerta ya
 * quedó creada y los que tienen la app abierta la reciben igual por Realtime.
 *
 * @param alertaId id de la alerta que el residente acaba de emitir.
 */
export async function difundirAlerta(alertaId: string): Promise<void> {
  try {
    await invocarFuncion('notificar-alerta', { alerta_id: alertaId });
  } catch (error) {
    console.warn('No se pudo difundir la alerta por push', error);
  }
}

/**
 * Escucha las alertas nuevas que el usuario con sesión puede ver.
 *
 * @param alLlegar función que recibe cada alerta nueva (la fila tal como quedó en la base).
 * @returns una función para dejar de escuchar; hay que llamarla al desmontar o al cerrar sesión.
 */
export function escucharAlertasNuevas(alLlegar: (alerta: Tables<'alertas'>) => void): () => void {
  // Nombre único por suscripción, por lo mismo que `avisoDeIngreso.ts`: un canal ya suscrito con el mismo
  // nombre no acepta otro `on()`.
  const canal = supabase
    .channel(`alertas-nuevas-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, (cambio) =>
      alLlegar(cambio.new as Tables<'alertas'>),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}
