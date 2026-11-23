/**
 * Repositorio del aviso de ingreso: escucha por Realtime cuando una visita del residente ingresa (RF21).
 *
 * Qué hace: abre un canal de Supabase Realtime sobre `pases_visita` filtrado por el residente y avisa cada
 * vez que uno de sus pases pasa a `usado` por el ingreso de la visita. La salida de la visita (RF20) también
 * actualiza el pase, pero no es un ingreso: esos cambios se ignoran.
 * Cómo funciona: Realtime respeta RLS, así que el residente solo recibe cambios de sus propios pases. Hace
 * falta la migración `20261123000001_realtime_pases.sql`, que publica la tabla.
 * Se usa con: `src/hooks/useAvisoDeIngreso.ts`.
 * Depende de: `src/lib/supabase.ts` y de `src/tipos/base_de_datos.ts` (generado).
 */
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/tipos/base_de_datos';

/** Lo que se avisa de un ingreso: qué pase y quién ingresó. */
export type Ingreso = { paseId: string; nombreVisitante: string };

/**
 * Escucha los ingresos de las visitas de un residente.
 *
 * @param residenteId id del perfil con sesión (el canal solo pide sus pases).
 * @param alIngresar función que recibe cada ingreso.
 * @returns una función para dejar de escuchar; hay que llamarla al desmontar o al cerrar sesión.
 */
export function escucharIngresos(
  residenteId: string,
  alIngresar: (ingreso: Ingreso) => void,
): () => void {
  // Nombre único por suscripción: `supabase.channel(nombre)` devuelve el canal que ya exista con ese
  // nombre, y agregarle un `on()` a un canal ya suscrito lanza "cannot add postgres_changes callbacks
  // after subscribe()". Quitar un canal es asíncrono, así que si el efecto se vuelve a ejecutar (otra
  // instancia de las pestañas, un refresco en desarrollo) el canal viejo aún existe. Es la misma solución
  // que usa `resultadosEncuesta.ts` (RF12).
  const canal = supabase
    .channel(`ingresos-${residenteId}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pases_visita',
        filter: `residente_id=eq.${residenteId}`,
      },
      (cambio) => {
        const pase = cambio.new as Tables<'pases_visita'>;
        // Ingreso = usado, con hora de ingreso y todavía sin salida. Al registrar la salida, el pase ya
        // tiene `salida_en` y no se vuelve a avisar.
        if (pase.estado === 'usado' && pase.ingreso_en && !pase.salida_en) {
          alIngresar({ paseId: pase.id, nombreVisitante: pase.nombre_visitante });
        }
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}
