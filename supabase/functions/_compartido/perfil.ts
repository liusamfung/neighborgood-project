/**
 * Perfil y rol de quien llama a una Edge Function.
 *
 * Qué hace: `exigirPerfil` lee el perfil del usuario autenticado y comprueba que esté activo y, si se
 * pide, que tenga uno de los roles permitidos. Devuelve el perfil o la respuesta de error lista para
 * entregar (401, 403 o 500).
 * Por qué existe: `withSupabase({ auth: 'user' })` ya garantiza que hay un usuario con sesión válida,
 * pero no sabe de roles. Aquí se aplica la regla de NeighborGood: sin perfil activo no se hace nada,
 * igual que las políticas RLS (supabase/migrations, parte 5).
 * Se usa con: `quien-soy/manejador.ts` y las funciones del pase QR (RF15 a RF22: el residente crea el
 * pase, el guardia lo valida). Depende de `_compartido/respuestas.ts` y de la tabla `perfiles`.
 */
import type { SupabaseContext } from '@supabase/server'
import { respuestaError } from './respuestas.ts'

/** Los tres roles de la app; coinciden con el enumerado `rol_usuario` de la base de datos. */
export type Rol = 'directiva' | 'residente' | 'guardia'

/** Columnas de `perfiles` que necesitan las funciones. */
export type Perfil = {
  id: string
  unidad_id: string | null
  nombre: string
  apellido: string
  rol: Rol
  activo: boolean
}

/**
 * Lo único que `exigirPerfil` necesita del contexto de la función: el cliente del usuario y su
 * identidad. Es un subconjunto de `SupabaseContext`, así se puede probar con un contexto falso.
 */
export type ContextoMinimo = Pick<SupabaseContext, 'supabase' | 'userClaims'>

/**
 * Contexto para las funciones que escriben con la `service_role` (por ejemplo, crear un pase): suma el
 * cliente administrador (`supabaseAdmin`), que se salta RLS. Se usa solo después de comprobar quién
 * llama con `exigirPerfil`; la clave la inyecta Supabase en el entorno y nunca se escribe en el repo.
 */
export type ContextoConAdmin = ContextoMinimo & Pick<SupabaseContext, 'supabaseAdmin'>

/** Resultado de `exigirPerfil`: o hay perfil, o hay una respuesta de error que se devuelve tal cual. */
export type ResultadoPerfil =
  | { perfil: Perfil; respuesta?: never }
  | { perfil?: never; respuesta: Response }

/**
 * Comprueba quién llama y qué rol tiene.
 *
 * @param ctx contexto de la función (cliente con el JWT del usuario e identidad).
 * @param opciones `roles`: si se indica, solo esos roles pueden continuar.
 * @returns el perfil activo del usuario o la respuesta de error que la función debe devolver.
 */
export async function exigirPerfil(
  ctx: ContextoMinimo,
  opciones: { roles?: Rol[] } = {},
): Promise<ResultadoPerfil> {
  const usuarioId = ctx.userClaims?.id
  if (!usuarioId) {
    return { respuesta: respuestaError(401, 'no_autenticado', 'Inicia sesión para continuar.') }
  }

  // Se lee con el cliente del usuario: las políticas RLS de `perfiles` ya limitan lo que puede ver.
  const { data, error } = await ctx.supabase
    .from('perfiles')
    .select('id, unidad_id, nombre, apellido, rol, activo')
    .eq('id', usuarioId)
    .maybeSingle()

  if (error) {
    // El detalle va al registro de la función (sin datos personales); el usuario ve un mensaje general.
    console.error('No se pudo leer el perfil', error.message)
    return {
      respuesta: respuestaError(500, 'error_interno', 'No pudimos validar tu perfil. Inténtalo de nuevo.'),
    }
  }

  const perfil = data as Perfil | null
  if (!perfil || !perfil.activo) {
    return {
      respuesta: respuestaError(403, 'sin_perfil', 'Tu correo no está habilitado. Contacta a la directiva.'),
    }
  }
  if (opciones.roles && !opciones.roles.includes(perfil.rol)) {
    return {
      respuesta: respuestaError(403, 'rol_no_permitido', 'Tu rol no puede hacer esta acción.'),
    }
  }
  return { perfil }
}
