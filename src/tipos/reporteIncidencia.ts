/**
 * Tipos del reporte de una incidencia (RF29).
 *
 * Qué hace: describe lo que el residente llena en la pantalla P7 antes de enviar. No contiene lógica.
 * Se usa con: `src/utilidades/reporteIncidencia.ts` (crea y valida el borrador),
 * `src/repositorios/reportarIncidencia.ts` (sube las fotos y envía el reporte),
 * `src/componentes/reportes/SelectorFotos.tsx` (produce las fotos) y la pantalla
 * `src/app/residente/incidencias/nueva.tsx`.
 * Depende de: `ImagenElegida` de `src/tipos/aviso.ts` (uri, tipo y extensión de una imagen elegida).
 */
import type { ImagenElegida } from '@/tipos/aviso';

/** Lo que el residente llena en la pantalla P7 antes de enviar la incidencia. */
export type BorradorReporte = {
  /** Dónde ocurre; se precarga con la unidad del residente y se puede editar (corrección 3 de DISENO.md). */
  ubicacion: string;
  /** Qué pasa. Es obligatoria (`incidencias.descripcion` no admite nulos). */
  descripcion: string;
  /** Fotos elegidas, de 1 a 3: sin foto la app no deja enviar y una cuarta la rechaza la base. */
  fotos: ImagenElegida[];
};
