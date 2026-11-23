/**
 * Repositorio del reporte de incidencias: sube las fotos y crea la incidencia (RF29).
 *
 * Qué hace: `reportarIncidencia` genera el id de la incidencia, sube las fotos (de 1 a 3) al bucket privado
 * `incidencias` y llama a la función SQL `crear_incidencia`, que guarda la incidencia y sus fotos en una sola
 * transacción con estado `pendiente`.
 * Cómo funciona: Storage y Postgres son dos servicios y no comparten transacción. Por eso las fotos se
 * suben primero (así nunca queda una incidencia sin fotos) y, si una subida o la función fallan, se borran
 * las fotos que ya estaban subidas. La función corre con los permisos del usuario: RLS y la política de
 * Storage deciden que solo un residente reporte y que solo escriba en su carpeta.
 * Se usa con: `src/hooks/useReportarIncidencia.ts` y la pantalla `src/app/residente/incidencias/nueva.tsx`.
 * Depende de: `src/lib/supabase.ts`, `src/utilidades/reporteIncidencia.ts` (id y ruta de las fotos),
 * `src/tipos/reporteIncidencia.ts`, `expo-file-system` (lee el archivo local) y de la migración
 * `supabase/migrations/20261124000001_crear_incidencia.sql`.
 */
import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import type { BorradorReporte } from '@/tipos/reporteIncidencia';
import { nuevoIdIncidencia, rutaFoto } from '@/utilidades/reporteIncidencia';

/** Nombre del bucket privado de Storage donde viven las fotos de las incidencias (migración 6). */
const BUCKET_INCIDENCIAS = 'incidencias';

/**
 * Error propio de la subida de una foto, para distinguirlo de los errores de Postgres.
 * `mensajeErrorReporte` lo reconoce por su `name` (la utilidad no importa esta clase para poder probarse
 * sin React Native).
 */
class ErrorFoto extends Error {
  name = 'ErrorFoto';
}

/**
 * Sube una foto al bucket `incidencias`.
 *
 * @param ruta ruta de destino (`{usuario}/{incidencia}/{orden}.ext`).
 * @param uri ruta local del archivo en el teléfono.
 * @param mimeType tipo de la imagen.
 * @throws ErrorFoto si no se puede leer el archivo o la subida falla.
 */
async function subirFoto(ruta: string, uri: string, mimeType: string): Promise<void> {
  try {
    const bytes = await new File(uri).arrayBuffer();
    const { error } = await supabase.storage
      .from(BUCKET_INCIDENCIAS)
      .upload(ruta, bytes, { contentType: mimeType });
    if (error) throw error;
  } catch {
    throw new ErrorFoto('No se pudo subir la foto');
  }
}

/**
 * Reporta una incidencia nueva con sus fotos.
 *
 * @param usuarioId id del residente (`auth.uid()`): es la primera carpeta de cada foto.
 * @param borrador ubicación, descripción y fotos que llenó el residente. Los textos se envían sin espacios
 * sobrantes; la base revisa de nuevo todo.
 * @returns el id de la incidencia creada. Lanza el error de Supabase o un `ErrorFoto` si algo falla; para
 * mostrarlo usa `mensajeErrorReporte`. Si falla, las fotos ya subidas se borran.
 */
export async function reportarIncidencia(
  usuarioId: string,
  borrador: BorradorReporte,
): Promise<string> {
  const incidenciaId = nuevoIdIncidencia();
  const subidas: string[] = [];

  try {
    // Las fotos se suben una por una y en orden: así `orden` (1 a 3) coincide con la posición en pantalla.
    for (const [indice, foto] of borrador.fotos.entries()) {
      const ruta = rutaFoto(usuarioId, incidenciaId, indice + 1, foto.extension);
      await subirFoto(ruta, foto.uri, foto.mimeType);
      subidas.push(ruta);
    }

    const { data, error } = await supabase.rpc('crear_incidencia', {
      p_id: incidenciaId,
      p_ubicacion: borrador.ubicacion.trim(),
      p_descripcion: borrador.descripcion.trim(),
      p_fotos: subidas,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    // La incidencia no quedó guardada: se quitan las fotos huérfanas (si el borrado falla, no importa).
    if (subidas.length > 0) await supabase.storage.from(BUCKET_INCIDENCIAS).remove(subidas);
    throw error;
  }
}
