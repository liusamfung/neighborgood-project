/**
 * RF11: lee páginas del historial visible por RLS, con categoría y vigencia en el servidor.
 * Lo consume useHistorial. No amplía permisos ni elimina datos caducados.
 */
import { supabase } from '@/lib/supabase';
import type { PeriodoHistorial, PublicacionHistorial, TipoPublicacion } from '@/tipos/historial';

export const TAMANO_PAGINA_HISTORIAL = 20;

/** Devuelve una página estable; conserva publicaciones finalizadas y respeta sectores mediante RLS. */
export async function listarHistorial(
  tipo: TipoPublicacion,
  periodo: PeriodoHistorial,
  categoriaId: string | null,
  pagina: number,
): Promise<PublicacionHistorial[]> {
  const ahora = new Date().toISOString();
  const desde = pagina * TAMANO_PAGINA_HISTORIAL;
  if (tipo === 'avisos') {
    let consulta = supabase
      .from('avisos')
      .select(
        'id,titulo,descripcion,vigente_desde,vigente_hasta,categoria:categorias_aviso(id,nombre)',
      )
      .order('vigente_desde', { ascending: false })
      .order('id')
      .range(desde, desde + TAMANO_PAGINA_HISTORIAL - 1);
    if (categoriaId) consulta = consulta.eq('categoria_id', categoriaId);
    if (periodo === 'vigentes')
      consulta = consulta.lte('vigente_desde', ahora).gt('vigente_hasta', ahora);
    if (periodo === 'anteriores') consulta = consulta.lte('vigente_hasta', ahora);
    const { data, error } = await consulta;
    if (error) throw error;
    return data.map((f) => ({ ...f, inicio: f.vigente_desde, fin: f.vigente_hasta }));
  }
  let consulta = supabase
    .from('encuestas')
    .select('id,titulo,descripcion,abre_en,cierra_en,categoria:categorias_aviso(id,nombre)')
    .order('abre_en', { ascending: false })
    .order('id')
    .range(desde, desde + TAMANO_PAGINA_HISTORIAL - 1);
  if (categoriaId) consulta = consulta.eq('categoria_id', categoriaId);
  if (periodo === 'vigentes') consulta = consulta.lte('abre_en', ahora).gt('cierra_en', ahora);
  if (periodo === 'anteriores') consulta = consulta.lte('cierra_en', ahora);
  const { data, error } = await consulta;
  if (error) throw error;
  return data.map((f) => ({ ...f, inicio: f.abre_en, fin: f.cierra_en }));
}
