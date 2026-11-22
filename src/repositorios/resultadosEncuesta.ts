/**
 * RF12: metadatos visibles y conteos agregados de la RPC existente, sin leer votos individuales.
 * useResultadosEncuesta consume estas consultas y la suscripción a cambios de metadatos.
 * Realtime requiere 20261122010000_resultados_realtime.sql; su falta no amplía permisos.
 */
import { supabase } from '@/lib/supabase';

/** Consulta metadatos y pide al servidor autorización para mostrar los agregados. */
export async function obtenerResultadosEncuesta(id: string) {
  const { data: encuesta, error: errorEncuesta } = await supabase
    .from('encuestas')
    .select(
      'id,titulo,cierra_en,resultados_en_vivo,preguntas:encuesta_preguntas(id,texto,orden,seleccion,opciones:encuesta_opciones(id,texto,orden))',
    )
    .eq('id', id)
    .maybeSingle();
  if (errorEncuesta) throw errorEncuesta;
  if (!encuesta) return null;
  const { data, error } = await supabase.rpc('resultados_encuesta', { p_encuesta_id: id });
  if (error && error.code !== '42501') throw error;
  const totales = new Map((data ?? []).map((f) => [f.opcion_id, f.total]));
  return {
    encuesta,
    permitido: !error,
    preguntas: error
      ? []
      : encuesta.preguntas
          .sort((a, b) => a.orden - b.orden)
          .map((p) => ({
            ...p,
            opciones: p.opciones
              .sort((a, b) => a.orden - b.orden)
              .map((o) => ({ ...o, total: totales.get(o.id) ?? 0 })),
          })),
  };
}

/** Escucha solo la encuesta visible; nunca se suscribe a los votos de otras unidades. */
export function escucharResultadosEncuesta(
  id: string,
  alCambiar: () => void,
  alConectar: (conectado: boolean) => void,
) {
  const canal = supabase
    .channel(`resultados:${id}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'encuestas', filter: `id=eq.${id}` },
      alCambiar,
    )
    .subscribe((estado) => {
      alConectar(estado === 'SUBSCRIBED');
      if (estado === 'SUBSCRIBED') alCambiar(); // cubre cambios ocurridos durante la conexión inicial
    });
  return () => {
    void supabase.removeChannel(canal);
  };
}
