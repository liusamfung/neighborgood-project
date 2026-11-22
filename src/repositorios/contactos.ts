/**
 * Acceso a contactos de emergencia (RF4). Solo este repositorio habla con Supabase.
 * Lo consume useContactosEmergencia; usa los tipos generados, las reglas del borrador y RLS.
 * Cada consulta filtra por propietario, incluso al editar o borrar un id; nunca usa service_role.
 * Las posiciones se consultan al crear y los conflictos simultáneos los resuelve UNIQUE en la base.
 */
import { supabase } from '@/lib/supabase';
import type { BorradorContacto, ContactoEmergencia } from '@/tipos/contacto';
import { datosContacto, siguienteOrdenContacto } from '@/utilidades/contactosEmergencia';

const COLUMNAS = 'id, usuario_id, nombre, telefono, parentesco, correo, orden';

/** Lista solo los contactos del propietario solicitado, ordenados por su posición del modelo. */
export async function listarContactos(usuarioId: string): Promise<ContactoEmergencia[]> {
  const { data, error } = await supabase
    .from('contactos_emergencia')
    .select(COLUMNAS)
    .eq('usuario_id', usuarioId)
    .order('orden');
  if (error) throw error;
  return data;
}

/** Crea en la primera posición libre. Nunca reintenta automáticamente una escritura incierta. */
export async function crearContacto(
  usuarioId: string,
  borrador: BorradorContacto,
): Promise<ContactoEmergencia> {
  const campos = datosContacto(borrador);
  const actuales = await listarContactos(usuarioId);
  const orden = siguienteOrdenContacto(actuales);
  if (orden === null)
    throw new Error('Ya tienes 3 de 3 contactos. Elimina uno antes de agregar otro.');
  const { data, error } = await supabase
    .from('contactos_emergencia')
    .insert({ ...campos, usuario_id: usuarioId, orden })
    .select(COLUMNAS)
    .single();
  if (error) throw error;
  return data;
}

/** Actualiza datos editables; conserva propietario y posición y detecta filas borradas o ajenas. */
export async function editarContacto(
  usuarioId: string,
  id: string,
  borrador: BorradorContacto,
): Promise<ContactoEmergencia> {
  const { data, error } = await supabase
    .from('contactos_emergencia')
    .update(datosContacto(borrador))
    .eq('id', id)
    .eq('usuario_id', usuarioId)
    .select(COLUMNAS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('El contacto ya no está disponible. Actualiza la lista.');
  return data;
}

/** Borra únicamente una fila propia y comprueba que el servidor confirmó su eliminación. */
export async function eliminarContacto(usuarioId: string, id: string): Promise<void> {
  const { data, error } = await supabase
    .from('contactos_emergencia')
    .delete()
    .eq('id', id)
    .eq('usuario_id', usuarioId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('El contacto ya no está disponible. Actualiza la lista.');
}
