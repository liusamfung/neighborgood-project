/**
 * Contexto falso para probar las Edge Functions sin red ni base de datos.
 *
 * Qué hace: arma un objeto con la misma forma que el contexto de `withSupabase` (cliente de Supabase
 * e identidad del usuario), pero que contesta lo que cada prueba le indique.
 * Se usa con: `_compartido/perfil_test.ts` y `quien-soy/manejador_test.ts`. No se despliega: ninguna
 * función lo importa.
 */
import type { ContextoMinimo, Perfil } from './perfil.ts'

/** Lo que el cliente falso contesta a la consulta de `perfiles`. */
type RespuestaBase = { data: Perfil | null; error: { message: string } | null }

/**
 * Crea un contexto falso.
 *
 * @param opciones `usuario`: identidad del llamador (`null` simula que no hay sesión).
 * `respuesta`: lo que devuelve la consulta de `perfiles`.
 */
export function crearContextoFalso(opciones: {
  usuario: { id: string; email?: string } | null
  respuesta: RespuestaBase
}): ContextoMinimo {
  // Imita la cadena `from().select().eq().maybeSingle()` que usa `exigirPerfil`.
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    maybeSingle: () => Promise.resolve(opciones.respuesta),
  }
  return {
    supabase: { from: () => consulta },
    userClaims: opciones.usuario,
  } as unknown as ContextoMinimo
}

/** Un perfil de ejemplo para las pruebas; se puede cambiar cualquier campo. */
export function perfilDeEjemplo(cambios: Partial<Perfil> = {}): Perfil {
  return {
    id: '90000000-0000-0000-0000-000000000011',
    unidad_id: '20000000-0000-0000-0000-000000000001',
    nombre: 'Rosa',
    apellido: 'Mendoza Paredes',
    rol: 'residente',
    activo: true,
    ...cambios,
  }
}
