/**
 * Repositorio de contactos de emergencia: los hasta 3 contactos de cada usuario (RF4).
 *
 * Qué hace: lista, agrega, edita y borra filas de `contactos_emergencia`, y traduce los errores de la
 * base a mensajes en español.
 * Cómo funciona: el máximo de 3 lo impone la base con la columna `orden` (de 1 a 3, única por
 * usuario): al agregar se usa el primer número libre y, si no queda ninguno, se rechaza. Las políticas
 * RLS (migración 5) dejan que cada usuario gestione solo los suyos.
 * Se usa con: `src/hooks/useContactos.ts` y la pantalla `src/app/residente/(tabs)/perfil.tsx`.
 * Depende de: `src/lib/supabase.ts` y `src/tipos/base_de_datos.ts`.
 */
import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/tipos/base_de_datos';

/** Máximo de contactos por usuario (criterio de aceptación de RF4). */
export const MAXIMO_CONTACTOS = 3;

/** Fila de `contactos_emergencia`. */
export type Contacto = Tables<'contactos_emergencia'>;

/** Lo que se llena en el formulario de un contacto. */
export type DatosContacto = {
  nombre: string;
  telefono: string;
  /** Opcional: relación con el residente, por ejemplo "Hija". */
  parentesco: string;
  /** Opcional: lo usará la próxima feature de correo de alerta (RF26, fuera de alcance por ahora). */
  correo: string;
};

/** Error propio: el usuario ya tiene los 3 contactos permitidos. */
export class LimiteDeContactosError extends Error {}

/**
 * Lista los contactos de un usuario, en el orden en que se muestran (1, 2, 3).
 *
 * @param usuarioId FK → perfiles.id
 */
export async function listarContactos(usuarioId: string): Promise<Contacto[]> {
  const { data, error } = await supabase
    .from('contactos_emergencia')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('orden');
  if (error) throw error;
  return data;
}

/**
 * Agrega un contacto en el primer `orden` libre (1 a 3).
 *
 * @param usuarioId FK → perfiles.id (el usuario con sesión; RLS rechaza cualquier otro).
 * @throws LimiteDeContactosError si ya hay 3 contactos.
 */
export async function agregarContacto(usuarioId: string, datos: DatosContacto): Promise<void> {
  const actuales = await listarContactos(usuarioId);
  const usados = new Set(actuales.map((c) => c.orden));
  const libre = [1, 2, 3].find((n) => !usados.has(n));
  if (!libre) throw new LimiteDeContactosError('Ya tienes 3 contactos');

  const { error } = await supabase.from('contactos_emergencia').insert({
    usuario_id: usuarioId,
    nombre: datos.nombre.trim(),
    telefono: datos.telefono.trim(),
    parentesco: datos.parentesco.trim() || null,
    correo: datos.correo.trim().toLowerCase() || null,
    orden: libre,
  });
  if (error) throw error;
}

/**
 * Cambia el nombre, el teléfono, el parentesco o el correo de un contacto (el orden no cambia).
 *
 * @param contactoId id de la fila de `contactos_emergencia`.
 */
export async function editarContacto(contactoId: string, datos: DatosContacto): Promise<void> {
  const { error } = await supabase
    .from('contactos_emergencia')
    .update({
      nombre: datos.nombre.trim(),
      telefono: datos.telefono.trim(),
      parentesco: datos.parentesco.trim() || null,
      correo: datos.correo.trim().toLowerCase() || null,
    })
    .eq('id', contactoId);
  if (error) throw error;
}

/** Borra un contacto; su número de orden queda libre para el siguiente que se agregue. */
export async function borrarContacto(contactoId: string): Promise<void> {
  const { error } = await supabase.from('contactos_emergencia').delete().eq('id', contactoId);
  if (error) throw error;
}

/**
 * Traduce un error de este repositorio a un texto en español.
 *
 * @param error lo que lanzó una función de este archivo.
 * @returns un mensaje corto; los errores no previstos usan uno genérico.
 */
export function mensajeDeErrorContacto(error: unknown): string {
  if (error instanceof LimiteDeContactosError) {
    return 'Ya tienes 3 contactos. Borra uno para agregar otro.';
  }
  const e = error as Partial<PostgrestError> | null;
  switch (e?.code) {
    case '23505': // dos altas a la vez tomaron el mismo orden
    case '23514': // CHECK ck_contactos_orden_1_a_3
      return 'Ya tienes 3 contactos. Borra uno para agregar otro.';
    case '42501':
      return 'No tienes permiso para cambiar estos contactos.';
  }
  if (!e?.code) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'No pudimos guardar el contacto. Inténtalo de nuevo.';
}
