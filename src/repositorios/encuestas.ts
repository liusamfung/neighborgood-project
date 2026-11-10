/**
 * Repositorio de encuestas: publicar una encuesta nueva (RF8, RF13, RF14).
 *
 * Qué hace: convierte el borrador de la pantalla P14 en la llamada a la función SQL `crear_encuesta`,
 * que guarda la encuesta, sus sectores, preguntas y opciones en una sola transacción: o queda todo o
 * no queda nada. También traduce los errores de la base a mensajes en español.
 * Cómo funciona: la función corre con los permisos del usuario, así que RLS decide quién puede
 * publicar (solo la directiva). El orden de preguntas y opciones es el del arreglo que se envía.
 * Se usa con: `src/hooks/useCrearEncuesta.ts` y la pantalla `src/app/directiva/encuestas/nueva.tsx`.
 * Depende de: `src/lib/supabase.ts`, `src/tipos/encuesta.ts`, `src/utilidades/borradorEncuesta.ts` y de
 * la migración `supabase/migrations/20261110000001_crear_encuesta.sql`.
 */
import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { BorradorEncuesta } from '@/tipos/encuesta';
import { opcionesConTexto } from '@/utilidades/borradorEncuesta';

/**
 * Publica una encuesta con la directiva como autora.
 *
 * @param borrador lo que llenó la directiva. Las opciones vacías se descartan y los textos se envían
 * sin espacios sobrantes; la base revisa de nuevo el contenido.
 * @returns el id de la encuesta creada. Lanza el error de Supabase si falla; para mostrarlo usa
 * `mensajeDeErrorEncuesta`.
 */
export async function crearEncuesta(borrador: BorradorEncuesta): Promise<string> {
  const { data, error } = await supabase.rpc('crear_encuesta', {
    p_titulo: borrador.titulo.trim(),
    p_descripcion: borrador.descripcion.trim(),
    // La validación de la pantalla garantiza una categoría; el operador `!` lo deja explícito.
    p_categoria_id: borrador.categoriaId!,
    p_prioridad: borrador.obligatoria ? 'alta' : 'normal',
    p_resultados_en_vivo: borrador.resultadosEnVivo,
    p_abre_en: borrador.abreEn.toISOString(),
    p_cierra_en: borrador.cierraEn.toISOString(),
    p_sectores: borrador.sectorIds,
    p_preguntas: borrador.preguntas.map((pregunta) => ({
      texto: pregunta.texto.trim(),
      seleccion: pregunta.seleccion,
      opciones: opcionesConTexto(pregunta),
    })),
  });
  if (error) throw error;
  return data;
}

/**
 * Traduce un error de `crearEncuesta` a un texto en español para la directiva.
 *
 * @param error lo que lanzó `crearEncuesta` (error de Postgres o de red).
 * @returns un mensaje corto; los errores no previstos usan uno genérico.
 */
export function mensajeDeErrorEncuesta(error: unknown): string {
  const e = error as Partial<PostgrestError> | null;
  switch (e?.code) {
    case '23514': // CHECK ck_encuestas_cierre_posterior
      return 'La fecha de cierre debe ser posterior a la de apertura.';
    case '22023': // la función crear_encuesta ya responde en español
      return e.message ?? 'Revisa los datos de la encuesta.';
    case '42501':
      return 'No tienes permiso para crear encuestas.';
    case '23503': // categoría o sector que ya no existe
      return 'La categoría o el sector elegido ya no existe. Vuelve a abrir la pantalla.';
  }
  // Sin código de Postgres: la petición ni llegó al servidor (sin internet).
  if (!e?.code) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'No pudimos publicar la encuesta. Inténtalo de nuevo.';
}
