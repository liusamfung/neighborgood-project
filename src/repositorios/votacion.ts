/**
 * Acceso de RF9 a Supabase: encuesta visible, voto de la unidad y RPC emitir_voto.
 * Lo usa useVotacion; combina las reglas puras con RLS y los tipos generados.
 * No escribe directamente en votos ni permite enviar usuario_id o unidad_id desde el formulario.
 */
import { supabase } from '@/lib/supabase';
import type { EncuestaVotacion, OpcionVoto } from '@/tipos/votacion';

/** Obtiene preguntas/opciones visibles, sin resultados ni votos de otras unidades. */
export async function obtenerEncuestaVotacion(id: string): Promise<EncuestaVotacion | null> {
  const { data, error } = await supabase
    .from('encuestas')
    .select(
      'id,titulo,descripcion,abre_en,cierra_en,prioridad,preguntas:encuesta_preguntas(id,texto,orden,seleccion,opciones:encuesta_opciones(id,texto,orden))',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    preguntas: data.preguntas
      .sort((a, b) => a.orden - b.orden)
      .map((p) => ({ ...p, opciones: p.opciones.sort((a, b) => a.orden - b.orden) })),
  };
}

/** Consulta si la unidad de la sesión ya votó; RLS limita la lectura a la unidad propia. */
export async function obtenerVotoUnidad(encuestaId: string, unidadId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('votos')
    .select('id')
    .eq('encuesta_id', encuestaId)
    .eq('unidad_id', unidadId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Envía todas las respuestas en una transacción. La RPC determina la unidad y rechaza duplicados. */
export async function emitirVoto(encuestaId: string, opciones: OpcionVoto[]): Promise<string> {
  const { data, error } = await supabase.rpc('emitir_voto', {
    p_encuesta_id: encuestaId,
    p_opciones: opciones,
  });
  if (error) throw error;
  return data;
}
