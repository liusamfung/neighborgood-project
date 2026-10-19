import { supabase } from '@/lib/supabase';
import type { Perfil } from '@/tipos/perfil';

const COLUMNAS = 'id, unidad_id, nombre, apellido, telefono, rol, activo';

/** Devuelve el perfil del usuario, o null si todavía no existe. */
export async function obtenerPerfil(usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select(COLUMNAS)
    .eq('id', usuarioId)
    .maybeSingle<Perfil>();
  if (error) throw error;
  return data;
}
