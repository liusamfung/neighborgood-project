/**
 * Tipos del historial de alertas (RF28).
 *
 * Qué hace: describe una fila del historial (fecha, tipo, unidad de origen y estado, con las respuestas
 * del personal para saber cuándo se resolvió) y los filtros que elige la directiva o el guardia.
 * No contiene lógica.
 * Se usa con: `src/repositorios/historialAlertas.ts`, `src/hooks/useHistorialAlertas.ts` y
 * `src/componentes/alertas/HistorialAlertas.tsx`.
 * Depende de: `src/tipos/alerta.ts` (tipo y estado de la alerta, que salen de los tipos generados).
 */
import type { EstadoAlerta, TipoAlerta } from '@/tipos/alerta';

/** Una alerta del historial, como la devuelve la consulta. */
export type AlertaHistorial = {
  id: string;
  tipo: TipoAlerta;
  estado: EstadoAlerta;
  creada_en: string;
  /** Unidad de origen (FK → unidades.id por `unidad_id`). */
  unidad: { codigo: string } | null;
  /** Sector de la alerta (FK → sectores.id por `sector_id`). */
  sector: { nombre: string } | null;
  /** Respuestas del personal (`alerta_atenciones`): "en camino" y "atendida", con su hora. */
  atenciones: { estado: EstadoAlerta; creado_en: string }[];
};

/** Filtros del historial; `null` significa "todos". */
export type FiltrosHistorialAlertas = {
  tipo: TipoAlerta | null;
  estado: EstadoAlerta | null;
};
