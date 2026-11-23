/**
 * Reglas puras del reporte de incidencias (RF29): borrador, validación, fotos, ruta y mensajes de error.
 *
 * Qué hace: concentra, sin red ni pantalla, lo que P7 necesita saber: crear el borrador, revisar que haya
 * ubicación, descripción y de 1 a 3 fotos, revisar el tipo y el peso de cada foto, armar la ruta de la foto en
 * Storage (`{usuario}/{incidencia}/{orden}.ext`), generar el id de la incidencia y traducir los errores.
 * Por qué la app genera el id: la ruta de cada foto lleva el id de la incidencia, y las fotos se suben antes
 * de guardar la incidencia (así nunca queda una incidencia sin fotos). La función `crear_incidencia` de la
 * base recibe ese id y comprueba que cada ruta empiece por `{su usuario}/{ese id}/`.
 * Se usa con: `src/app/residente/incidencias/nueva.tsx`, `src/componentes/reportes/SelectorFotos.tsx` y
 * `src/repositorios/reportarIncidencia.ts`.
 * Depende de: solo del tipo `BorradorReporte`. No importa nada de React Native, para poder probarse con
 * `node:test` (`herramientas/pruebas/reporteIncidencia.test.cjs`, `npm run test:reporte`).
 */
import type { BorradorReporte } from '@/tipos/reporteIncidencia';

/** Máximo de fotos por incidencia: lo impone también el CHECK `orden between 1 and 3` de la base. */
export const MAX_FOTOS = 3;

/** Tamaño máximo de una foto: 5 MB, el límite del bucket `incidencias` (migración 6). */
export const MAXIMO_BYTES = 5 * 1024 * 1024;

/** Tipos de imagen que admite el bucket `incidencias` y la extensión con que se guardan. */
export const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Extensión que corresponde a un tipo de archivo.
 *
 * @param mimeType tipo que informa el selector de imágenes (por ejemplo `image/jpeg`).
 * @returns `jpg`, `png` o `webp`; `null` si el tipo no es una de las tres imágenes admitidas.
 */
export function extensionDeMime(mimeType: string | null | undefined): string | null {
  return (mimeType && EXTENSIONES[mimeType]) || null;
}

/**
 * Revisa una foto elegida antes de aceptarla.
 *
 * @param mimeType tipo del archivo.
 * @param bytes peso en bytes si el selector lo informa (si no, no se puede revisar y se acepta).
 * @returns el mensaje de error en español, o `null` si la foto cumple.
 */
export function validarFoto(
  mimeType: string | null | undefined,
  bytes?: number | null,
): string | null {
  if (!extensionDeMime(mimeType)) return 'Solo se admiten fotos JPEG, PNG o WebP.';
  if (bytes != null && bytes > MAXIMO_BYTES)
    return 'La foto pesa más de 5 MB. Elige una más liviana.';
  return null;
}

/**
 * Ruta de una foto en el bucket `incidencias`: `{usuario_id}/{incidencia_id}/{orden}.{ext}`.
 * La política de Storage exige que la primera carpeta sea el id del residente que sube.
 *
 * @param usuarioId id del residente (`auth.uid()`).
 * @param incidenciaId id de la incidencia, generado con `nuevoIdIncidencia`.
 * @param orden posición de la foto, de 1 a 3.
 * @param extension `jpg`, `png` o `webp`, sin punto.
 */
export function rutaFoto(
  usuarioId: string,
  incidenciaId: string,
  orden: number,
  extension: string,
): string {
  return `${usuarioId}/${incidenciaId}/${orden}.${extension}`;
}

/**
 * Genera un identificador UUID v4 para la incidencia.
 *
 * Usa `crypto.randomUUID` cuando el motor lo trae; si no (no todos los motores de React Native lo tienen),
 * arma uno con `Math.random`. No es un secreto: solo debe ser único, y si chocara con uno existente la base
 * rechazaría la inserción por llave duplicada.
 */
export function nuevoIdIncidencia(): string {
  const cripto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cripto && typeof cripto.randomUUID === 'function') return cripto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
    const azar = Math.floor(Math.random() * 16);
    // La `y` fija los dos primeros bits de la variante (8, 9, a o b), como pide el formato UUID v4.
    const valor = caracter === 'x' ? azar : (azar & 0x3) | 0x8;
    return valor.toString(16);
  });
}

/**
 * Borrador vacío del reporte.
 *
 * @param ubicacionInicial texto con que se precarga la ubicación (por ejemplo, "Torre A · A-101").
 */
export function nuevoBorrador(ubicacionInicial: string): BorradorReporte {
  return { ubicacion: ubicacionInicial, descripcion: '', fotos: [] };
}

/** Errores por campo, ya escritos para mostrar junto a cada uno. */
export type ErroresReporte = Partial<Record<'ubicacion' | 'descripcion' | 'fotos', string>>;

/**
 * Revisa el borrador antes de enviarlo.
 *
 * @returns los errores por campo y `valido`: true si no hay ninguno (ubicación y descripción con texto, y de
 * 1 a 3 fotos).
 */
export function validarBorrador(borrador: BorradorReporte): {
  errores: ErroresReporte;
  valido: boolean;
} {
  const errores: ErroresReporte = {};
  if (!borrador.ubicacion.trim()) errores.ubicacion = 'Indica dónde ocurre.';
  if (!borrador.descripcion.trim()) errores.descripcion = 'Describe qué pasa.';
  if (borrador.fotos.length < 1) errores.fotos = 'Agrega al menos una foto.';
  else if (borrador.fotos.length > MAX_FOTOS)
    errores.fotos = `Puedes subir hasta ${MAX_FOTOS} fotos.`;
  return { errores, valido: Object.keys(errores).length === 0 };
}

/**
 * Traduce un error al enviar el reporte a un mensaje en español, sin detalles internos.
 *
 * @param error lo que lanzó la subida de una foto (`name === 'ErrorFoto'`), Supabase o la red.
 */
export function mensajeErrorReporte(error: unknown): string {
  if (error instanceof Error && error.name === 'ErrorFoto') {
    return 'No pudimos subir una foto. Revisa tu internet e inténtalo de nuevo.';
  }
  const codigo = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const mensaje =
    error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  switch (codigo) {
    case '22023': // la función crear_incidencia ya responde en español
      return mensaje || 'Revisa los datos de la incidencia.';
    case '42501':
    case 'PGRST301':
    case 'PGRST302':
      return 'No tienes permiso para reportar incidencias con esta cuenta. Cierra sesión e inicia de nuevo.';
    case '23505':
      return 'Esta incidencia ya se había enviado. Vuelve a abrir la pantalla para reportar otra.';
  }
  // Sin código de Postgres: la petición ni llegó al servidor (sin internet).
  if (!codigo) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'No pudimos enviar la incidencia. Inténtalo de nuevo.';
}
