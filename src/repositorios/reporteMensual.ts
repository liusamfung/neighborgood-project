/** RF31: consulta la vista existente respetando security_invoker/RLS.
 * useReporteMensual obtiene solo agregados; no descarga incidencias individuales para agruparlas.
 */
import { supabase } from '@/lib/supabase';
/** Rango cerrado de meses civiles de Lima; mes es una columna date. */
export async function obtenerReporteMensual(desde: string, hasta: string) {
  const { data, error } = await supabase
    .from('reporte_incidencias_mensual')
    .select('mes,total,pendientes,en_atencion,resueltas')
    .gte('mes', `${desde}-01`)
    .lte('mes', `${hasta}-01`)
    .order('mes');
  if (error) throw error;
  return data;
}
