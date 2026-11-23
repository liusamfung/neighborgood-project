/** RF30: lista incidencias y actualiza solo estado, bajo los GRANT/RLS existentes.
 * useIncidencias y AvisoIncidencia consumen estas funciones; hora y responsable los fija Postgres.
 */
import { supabase } from '@/lib/supabase';
import type { EstadoIncidencia } from '@/tipos/incidencia';

/** Lista por estado con paginación; el servidor limita al residente a sus propios reportes. */
export async function listarIncidencias(pagina: number, estado?: EstadoIncidencia) {
  let consulta = supabase
    .from('incidencias')
    .select(
      'id,descripcion,ubicacion,estado,creada_en,actualizada_en,resuelta_en,unidad:unidades(codigo)',
    );
  if (estado) consulta = consulta.eq('estado', estado);
  const { data, error } = await consulta
    .order('creada_en', { ascending: false })
    .order('id')
    .range(pagina * 20, pagina * 20 + 19);
  if (error) throw error;
  return data;
}

/** La versión observada evita sobrescribir cambios hechos desde otro teléfono. */
export async function actualizarIncidencia(
  id: string,
  anterior: EstadoIncidencia,
  version: string,
  estado: EstadoIncidencia,
) {
  const { data, error } = await supabase
    .from('incidencias')
    .update({ estado })
    .eq('id', id)
    .eq('estado', anterior)
    .eq('actualizada_en', version)
    .select('id,estado')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('La incidencia cambió o ya no tienes acceso. Actualiza la lista.');
  return data;
}

/** Solo cambios del reportante autenticado; transmite metadatos mínimos al aviso en la app. */
export function escucharMisIncidencias(
  usuarioId: string,
  alCambiar: (dato: { id: string; estado: EstadoIncidencia; version: string }) => void,
  alReconectar: () => void,
) {
  const canal = supabase
    .channel(`incidencias:${usuarioId}:${Math.random()}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'incidencias',
        filter: `reportado_por=eq.${usuarioId}`,
      },
      ({ new: fila }) => {
        if (
          typeof fila.id === 'string' &&
          typeof fila.actualizada_en === 'string' &&
          ['en_atencion', 'resuelto'].includes(fila.estado)
        )
          alCambiar({ id: fila.id, estado: fila.estado, version: fila.actualizada_en });
      },
    )
    .subscribe((estado) => {
      if (estado === 'SUBSCRIBED') alReconectar();
    });
  return () => {
    void supabase.removeChannel(canal);
  };
}
