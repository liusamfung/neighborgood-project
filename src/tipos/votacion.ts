/**
 * Tipos de RF9 para la encuesta publicada y las respuestas de una unidad.
 * Los usan votacion.ts (repositorio y reglas), useVotacion y la pantalla P5.
 * Reutilizan las filas generadas; no incluyen votos ni identidades de otras unidades.
 */
import type { Tables } from '@/tipos/base_de_datos';

/** Pregunta publicada, con opciones ordenadas por el repositorio. */
export type PreguntaVotacion = Pick<
  Tables<'encuesta_preguntas'>,
  'id' | 'texto' | 'orden' | 'seleccion'
> & {
  opciones: Pick<Tables<'encuesta_opciones'>, 'id' | 'texto' | 'orden'>[];
};

/** Datos visibles de la encuesta; RLS decide si corresponde al residente. */
export type EncuestaVotacion = Pick<
  Tables<'encuestas'>,
  'id' | 'titulo' | 'descripcion' | 'abre_en' | 'cierra_en' | 'prioridad'
> & {
  preguntas: PreguntaVotacion[];
};

/** Selección local por pregunta; la unidad y el usuario los determina el servidor. */
export type SeleccionesVoto = Record<string, string[]>;
export type OpcionVoto = { pregunta_id: string; opcion_id: string };
