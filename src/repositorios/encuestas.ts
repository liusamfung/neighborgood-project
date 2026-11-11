/**
 * Repositorio de encuestas: publicar una encuesta nueva (RF8, RF13, RF14), listar y leer encuestas
 * (RF11), votar (`emitirVoto`, RF9) y contar los votos (`resultadosEncuesta`, RF12). La parte de
 * lectura y voto la usan `src/hooks/useEncuestas.ts`, la pantalla P5 del residente y la P14b.
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

/** Encuesta tal como se muestra en las listas (RF11, RF14), con su categoría y los votos visibles. */
export type EncuestaListada = {
  id: string;
  titulo: string;
  descripcion: string | null;
  /** `alta` = obligatoria (RF14). */
  prioridad: 'normal' | 'alta';
  /** true = los residentes ven los resultados antes del cierre (RF12). */
  resultados_en_vivo: boolean;
  abre_en: string;
  cierra_en: string;
  /** FK → categorias_aviso.id */
  categoria_id: string;
  para_todos: boolean;
  categorias_aviso: { nombre: string };
  /** Sectores destino cuando `para_todos` es false (RF13); vacío si es para todo el condominio. */
  encuesta_sectores: { sectores: { nombre: string } }[];
  /**
   * Votos que RLS deja ver: un residente recibe solo el de su unidad (0 o 1 fila, sirve para saber
   * si su unidad ya votó); la directiva recibe todos (uno por unidad que participó).
   */
  votos: { id: string }[];
};

/** Opción de respuesta de una pregunta. */
export type OpcionEncuesta = { id: string; texto: string; orden: number };

/** Pregunta de una encuesta con sus opciones. */
export type PreguntaEncuesta = {
  id: string;
  texto: string;
  seleccion: 'unica' | 'multiple';
  orden: number;
  encuesta_opciones: OpcionEncuesta[];
};

/** Encuesta completa para votar o ver sus resultados (P5 y P14b). */
export type EncuestaDetalle = EncuestaListada & { encuesta_preguntas: PreguntaEncuesta[] };

/** Opción elegida al votar: `emitir_voto` exige la pregunta junto a la opción. */
export type OpcionElegida = { pregunta_id: string; opcion_id: string };

/** Fila de `resultados_encuesta`: cuántos votos tiene una opción. */
export type ConteoOpcion = { pregunta_id: string; opcion_id: string; total: number };

// Columnas comunes de la lista y del detalle.
const COLUMNAS_ENCUESTA =
  'id, titulo, descripcion, prioridad, resultados_en_vivo, abre_en, cierra_en, categoria_id, para_todos, categorias_aviso(nombre), encuesta_sectores(sectores(nombre)), votos(id)';

/**
 * Lista las encuestas que el usuario puede ver, de la más reciente a la más antigua (RF11).
 * El filtro por sector y por fecha de apertura lo aplica la política RLS "encuestas: lectura" (RF13).
 */
export async function listarEncuestas(): Promise<EncuestaListada[]> {
  const { data, error } = await supabase
    .from('encuestas')
    .select(COLUMNAS_ENCUESTA)
    .order('abre_en', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Trae una encuesta con sus preguntas y opciones, ya ordenadas.
 *
 * @param encuestaId id de la encuesta.
 * @returns la encuesta, o `null` si no existe o RLS no deja verla.
 */
export async function obtenerEncuesta(encuestaId: string): Promise<EncuestaDetalle | null> {
  const { data, error } = await supabase
    .from('encuestas')
    .select(
      `${COLUMNAS_ENCUESTA}, encuesta_preguntas(id, texto, seleccion, orden, encuesta_opciones(id, texto, orden))`,
    )
    .eq('id', encuestaId)
    .order('orden', { referencedTable: 'encuesta_preguntas' })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Las opciones se ordenan aquí: PostgREST no ordena una tabla anidada dos niveles con claridad.
  for (const pregunta of data.encuesta_preguntas) {
    pregunta.encuesta_opciones.sort((a, b) => a.orden - b.orden);
  }
  return data;
}

/**
 * Emite el voto de la unidad del residente (RF9) con la función SQL `emitir_voto`.
 *
 * @param encuestaId encuesta que se vota.
 * @param opciones al menos una opción por cada pregunta.
 * Lanza el error de Supabase si falla; `23505` significa que la unidad ya había votado.
 */
export async function emitirVoto(encuestaId: string, opciones: OpcionElegida[]): Promise<void> {
  const { error } = await supabase.rpc('emitir_voto', {
    p_encuesta_id: encuestaId,
    p_opciones: opciones,
  });
  if (error) throw error;
}

/**
 * Cuenta los votos por opción con la función SQL `resultados_encuesta` (RF12).
 * La función solo responde a un residente si la encuesta es "en vivo" o ya cerró; a la directiva
 * le responde siempre. No revela quién votó.
 */
export async function resultadosEncuesta(encuestaId: string): Promise<ConteoOpcion[]> {
  const { data, error } = await supabase.rpc('resultados_encuesta', {
    p_encuesta_id: encuestaId,
  });
  if (error) throw error;
  return data;
}

/**
 * Traduce un error de `emitirVoto` a un texto en español para el residente.
 *
 * @param error lo que lanzó `emitirVoto` (error de Postgres o de red).
 */
export function mensajeDeErrorVoto(error: unknown): string {
  const e = error as Partial<PostgrestError> | null;
  switch (e?.code) {
    case '23505': // llave única (encuesta_id, unidad_id): un voto por unidad (RF9)
      return 'Tu unidad ya votó en esta encuesta.';
    case '22023': // la función emitir_voto ya responde en español
    case '42501':
      return e.message ?? 'No se pudo registrar el voto.';
    case 'P0002':
      return 'La encuesta ya no existe.';
  }
  if (!e?.code) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'No pudimos registrar tu voto. Inténtalo de nuevo.';
}
