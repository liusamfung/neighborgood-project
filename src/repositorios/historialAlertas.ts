/**
 * Repositorio del historial de alertas (RF28): consulta el registro histórico de alertas de pánico.
 *
 * Qué hace: lee las alertas de la más reciente a la más antigua, de 20 en 20, con su fecha, tipo, unidad de
 * origen, sector y estado, más las respuestas del personal para mostrar cuándo se atendió. Se puede filtrar
 * por tipo y por estado (diagrama 4.4).
 * Cómo funciona: lee directo de `alertas` y `alerta_atenciones`; no hace falta Edge Function porque RLS ya
 * decide qué ve cada uno: la directiva y los guardias ven todas las alertas y todas sus respuestas
 * (políticas "alertas: lectura" y "alerta_atenciones: lectura"). Las pantallas no hablan con Supabase
 * directamente (RNF7).
 * Se usa con: `src/hooks/useHistorialAlertas.ts`.
 * Depende de: `src/lib/supabase.ts` y `src/tipos/historialAlertas.ts`.
 */
import { supabase } from '@/lib/supabase';
import type { AlertaHistorial, FiltrosHistorialAlertas } from '@/tipos/historialAlertas';

/** Alertas por página: las mismas que usa la lista de atención (RF27). */
export const ALERTAS_POR_PAGINA = 20;

/**
 * Lee una página del historial de alertas.
 *
 * @param filtros tipo y estado elegidos; `null` en un filtro trae todos.
 * @param pagina número de página, desde 0.
 * @returns las alertas de esa página. Lanza el error de Supabase si falla.
 */
export async function listarHistorialAlertas(
  filtros: FiltrosHistorialAlertas,
  pagina: number,
): Promise<AlertaHistorial[]> {
  let consulta = supabase
    .from('alertas')
    .select(
      'id, tipo, estado, creada_en, unidad:unidades(codigo), sector:sectores(nombre), atenciones:alerta_atenciones(estado, creado_en)',
    );
  if (filtros.tipo) consulta = consulta.eq('tipo', filtros.tipo);
  if (filtros.estado) consulta = consulta.eq('estado', filtros.estado);
  const desde = pagina * ALERTAS_POR_PAGINA;
  const { data, error } = await consulta
    .order('creada_en', { ascending: false })
    // Desempate por id: dos alertas en el mismo instante no se repiten ni se saltan entre páginas.
    .order('id')
    .range(desde, desde + ALERTAS_POR_PAGINA - 1);
  if (error) throw error;
  return data;
}
