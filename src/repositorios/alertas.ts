/** RF27: consulta alertas y registra respuestas en la bitácora existente bajo RLS.
 * Los hooks consumen estas funciones; el trigger del servidor cambia el estado y fija la hora.
 */
import { supabase } from '@/lib/supabase';

/** Lista paginada, limitada al emisor para residentes y al personal según las políticas. */
export async function listarAlertas(pagina: number, emisor?: string) {
  let consulta = supabase
    .from('alertas')
    .select('id,tipo,estado,creada_en,unidad:unidades(codigo),sector:sectores(nombre)');
  if (emisor) consulta = consulta.eq('emisor_id', emisor);
  const { data, error } = await consulta
    .order('creada_en', { ascending: false })
    .order('id')
    .range(pagina * 20, pagina * 20 + 19);
  if (error) throw error;
  return data;
}

/** Obtiene la alerta y las acciones visibles para el personal o su emisor. */
export async function obtenerAlerta(id: string) {
  const { data: alerta, error } = await supabase
    .from('alertas')
    .select('id,tipo,estado,creada_en,unidad:unidades(codigo),sector:sectores(nombre)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!alerta) return null;
  const { data: atenciones, error: fallo } = await supabase
    .from('alerta_atenciones')
    .select('id,estado,creado_en,usuario_id')
    .eq('alerta_id', id)
    .order('creado_en')
    .order('id');
  if (fallo) throw fallo;
  return { alerta, atenciones };
}

/** No actualiza alertas directamente ni reintenta inserciones de resultado incierto. */
export async function responderAlerta(
  id: string,
  usuarioId: string,
  estado: 'en_camino' | 'atendida',
) {
  const { error } = await supabase
    .from('alerta_atenciones')
    .insert({ alerta_id: id, usuario_id: usuarioId, estado });
  if (error) throw error;
}

/** Escucha cambios visibles; al reconectar fuerza recuperar el estado que pudo perderse. */
export function escucharAlertas(id: string | undefined, actualizar: () => void) {
  const canal = supabase
    .channel(`atencion:${id ?? 'lista'}:${Math.random()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alertas', ...(id ? { filter: `id=eq.${id}` } : {}) },
      actualizar,
    )
    .subscribe((estado) => {
      if (estado === 'SUBSCRIBED') actualizar();
    });
  return () => {
    void supabase.removeChannel(canal);
  };
}
