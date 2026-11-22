/** RF31: meses de Lima y relleno de meses vacíos para el hook y la gráfica.
 * La vista SQL calcula los conteos; estas funciones solo ordenan y preparan su presentación.
 */
import type { Database } from '@/tipos/base_de_datos';
type Fila = Database['public']['Views']['reporte_incidencias_mensual']['Row'];

/** Usa el mes civil de Lima, sin convertir la columna date a otra zona. */
export function mesActualLima(ahora = new Date()) {
  const p = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(ahora);
  return `${p.find((v) => v.type === 'year')!.value}-${p.find((v) => v.type === 'month')!.value}`;
}
/** Seis o doce meses ordenados, incluido el actual. */
export function mesesReporte(ultimo: string, cantidad: 6 | 12) {
  const [ano, mes] = ultimo.split('-').map(Number);
  return Array.from({ length: cantidad }, (_, i) =>
    new Date(Date.UTC(ano, mes - cantidad + i, 1)).toISOString().slice(0, 7),
  );
}
/** Cero solo para meses sin fila; rechaza conteos malformados en lugar de inventar valores. */
export function completarReporte(meses: string[], filas: Fila[]) {
  const porMes = new Map(filas.map((f) => [f.mes?.slice(0, 7), f]));
  return meses.map((mes) => {
    const f = porMes.get(mes);
    const valores = f ? [f.total, f.pendientes, f.en_atencion, f.resueltas] : [0, 0, 0, 0];
    if (valores.some((v) => v === null || !Number.isSafeInteger(v) || v < 0))
      throw new Error('Conteos mensuales inválidos');
    const [total, pendientes, enAtencion, resueltas] = valores as number[];
    if (total !== pendientes + enAtencion + resueltas)
      throw new Error('Total mensual inconsistente');
    return { mes, total, pendientes, enAtencion, resueltas };
  });
}
/** UTC solo nombra el mes civil ya calculado, sin desplazarlo al mes anterior. */
export function etiquetaMes(mes: string) {
  return new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    month: 'short',
    year: 'numeric',
  });
}
