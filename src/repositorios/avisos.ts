/**
 * Repositorio de avisos: publicar un aviso nuevo con su imagen opcional (RF7, RF13) y listar los avisos
 * visibles, con filtro por categoría (RF10, RF11).
 *
 * Qué hace: sube la imagen al bucket privado `avisos` (si hay) y llama a la función SQL `crear_aviso`,
 * que guarda el aviso y sus sectores en una sola transacción. También traduce los errores de la base
 * a mensajes en español.
 * Cómo funciona: Storage y Postgres son dos servicios y no comparten transacción. Por eso la imagen se
 * sube primero y, si después `crear_aviso` falla, se borra para no dejar archivos sueltos. La función
 * corre con los permisos del usuario, así que RLS decide quién puede publicar (solo la directiva).
 * Se usa con: `src/hooks/useCrearAviso.ts` y la pantalla `src/app/directiva/avisos/nuevo.tsx`;
 * `listarAvisos`, con `src/hooks/useAvisos.ts` y la pantalla P4 del residente.
 * Depende de: `src/lib/supabase.ts`, `src/tipos/aviso.ts`, `expo-file-system` (lee el archivo local) y de
 * la migración `supabase/migrations/20261110000002_crear_aviso.sql`.
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import type { AvisoListado, BorradorAviso, ImagenElegida } from '@/tipos/aviso';

// Columnas de la lista de avisos (P4); la categoría llega por la relación con `categorias_aviso`.
const COLUMNAS_LISTADO =
  'id, titulo, descripcion, imagen_path, vigente_desde, vigente_hasta, creado_en, categoria:categorias_aviso (id, nombre)';

/**
 * Lista los avisos que el usuario puede ver, del más reciente al más antiguo (RF10, RF11).
 *
 * @param categoriaId filtra por una categoría (RF10); `null` o ausente trae todas.
 * @returns los avisos visibles para el usuario. Quién ve qué lo decide la política RLS
 * "avisos: lectura": la directiva ve todos; el residente, solo los vigentes de su sector o
 * los marcados para todos. Lanza el error de Supabase si la consulta falla.
 */
export async function listarAvisos(categoriaId?: string | null): Promise<AvisoListado[]> {
  let consulta = supabase
    .from('avisos')
    .select(COLUMNAS_LISTADO)
    .order('vigente_desde', { ascending: false });
  // El filtro corre en la base (menos datos viajan); sin categoría, la consulta trae todas.
  if (categoriaId) consulta = consulta.eq('categoria_id', categoriaId);
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

/** Nombre del bucket privado de Storage donde viven las imágenes de los avisos (migración 6). */
const BUCKET_AVISOS = 'avisos';

/** Error propio de la subida de la imagen, para distinguirlo de los errores de Postgres. */
class ErrorImagen extends Error {}

/**
 * Sube la imagen de un aviso al bucket `avisos`.
 *
 * @param imagen archivo elegido de la galería.
 * @returns la ruta guardada en Storage, que luego va en `avisos.imagen_path`. La ruta combina la hora y un
 * número al azar para que dos avisos nunca se pisen el archivo.
 */
export async function subirImagenAviso(imagen: ImagenElegida): Promise<string> {
  const ruta = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imagen.extension}`;
  try {
    const bytes = await new File(imagen.uri).arrayBuffer();
    const { error } = await supabase.storage
      .from(BUCKET_AVISOS)
      .upload(ruta, bytes, { contentType: imagen.mimeType });
    if (error) throw error;
  } catch {
    throw new ErrorImagen('No se pudo subir la imagen');
  }
  return ruta;
}

/**
 * Publica un aviso con la directiva como autora.
 *
 * @param borrador lo que llenó la directiva. Los textos se envían sin espacios sobrantes; la base revisa
 * de nuevo el contenido.
 * @returns el id del aviso creado. Lanza el error de Supabase si falla; para mostrarlo usa
 * `mensajeDeErrorAviso`. Si el aviso no se guarda, la imagen ya subida se borra.
 */
export async function crearAviso(borrador: BorradorAviso): Promise<string> {
  const imagenPath = borrador.imagen ? await subirImagenAviso(borrador.imagen) : null;

  const { data, error } = await supabase.rpc('crear_aviso', {
    p_titulo: borrador.titulo.trim(),
    p_descripcion: borrador.descripcion.trim(),
    // La validación de la pantalla garantiza una categoría; el operador `!` lo deja explícito.
    p_categoria_id: borrador.categoriaId!,
    p_vigente_desde: borrador.vigenteDesde.toISOString(),
    p_vigente_hasta: borrador.vigenteHasta.toISOString(),
    p_sectores: borrador.sectorIds,
    // La función admite NULL, pero los tipos generados solo permiten omitir el argumento.
    p_imagen_path: imagenPath ?? undefined,
  });

  if (error) {
    // El aviso no quedó guardado: se quita la imagen huérfana (si falla el borrado, no importa).
    if (imagenPath) await supabase.storage.from(BUCKET_AVISOS).remove([imagenPath]);
    throw error;
  }
  return data;
}

/**
 * Traduce un error de `crearAviso` a un texto en español para la directiva.
 *
 * @param error lo que lanzó `crearAviso` (error de Postgres, de la subida o de red).
 * @returns un mensaje corto; los errores no previstos usan uno genérico.
 */
export function mensajeDeErrorAviso(error: unknown): string {
  if (error instanceof ErrorImagen) {
    return 'No pudimos subir la imagen. Revisa tu internet o quítala e inténtalo de nuevo.';
  }
  const e = error as Partial<PostgrestError> | null;
  switch (e?.code) {
    case '23514': // CHECK ck_avisos_vigencia_valida
      return 'La fecha de fin debe ser posterior a la de inicio.';
    case '22023': // la función crear_aviso ya responde en español
      return e.message ?? 'Revisa los datos del aviso.';
    case '42501':
      return 'No tienes permiso para publicar avisos.';
    case '23503': // categoría o sector que ya no existe
      return 'La categoría o el sector elegido ya no existe. Vuelve a abrir la pantalla.';
  }
  // Sin código de Postgres: la petición ni llegó al servidor (sin internet).
  if (!e?.code) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'No pudimos publicar el aviso. Inténtalo de nuevo.';
}
