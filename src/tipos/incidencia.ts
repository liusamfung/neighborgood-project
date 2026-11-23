/** RF30: etiquetas de estados del modelo; las usan repositorio, hook y gestión de incidencias. */
import type { Database } from './base_de_datos';
export type EstadoIncidencia = Database['public']['Enums']['estado_incidencia'];
export const ESTADO_INCIDENCIA: Record<EstadoIncidencia, string> = {
  pendiente: 'Pendiente',
  en_atencion: 'En atención',
  resuelto: 'Resuelto',
};
