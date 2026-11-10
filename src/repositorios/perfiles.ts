/**
 * Repositorio de perfiles: consultas a la tabla `perfiles` de Supabase.
 *
 * Qué hace: aísla la consulta del perfil para que las pantallas y el contexto no hablen con Supabase.
 * Cómo funciona: pide solo la fila del usuario; las políticas RLS ya limitan lo que cada rol puede
 * leer (un residente solo ve el suyo; la directiva, todos).
 * Se usa con: `src/contexto/SesionContext.tsx` (carga el perfil tras iniciar sesión).
 * Depende de: `src/lib/supabase.ts` y del tipo `Perfil` de `src/tipos/perfil.ts`.
 */
import { supabase } from '@/lib/supabase';
import type { Perfil } from '@/tipos/perfil';

// Columnas que usa la app; coinciden con el tipo `Perfil` (tabla `perfiles`).
const COLUMNAS = 'id, unidad_id, nombre, apellido, telefono, rol, activo, creado_en';

/**
 * Consulta el perfil de un usuario en la tabla `perfiles`.
 *
 * @param usuarioId id del usuario (el mismo de `auth.users`, que es la llave de `perfiles`).
 * @returns el perfil, o `null` si todavía no existe (por ejemplo, un correo no habilitado: el trigger
 * de registro no le creó perfil). Lanza el error de Supabase si la consulta falla.
 */
export async function obtenerPerfil(usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select(COLUMNAS)
    .eq('id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
