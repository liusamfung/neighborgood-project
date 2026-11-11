/**
 * Contexto falso para probar las Edge Functions sin red ni base de datos.
 *
 * Qué hace: arma un objeto con la misma forma que el contexto de `withSupabase` (cliente de Supabase
 * e identidad del usuario), pero que contesta lo que cada prueba le indique.
 * Se usa con: `_compartido/perfil_test.ts`, `quien-soy/manejador_test.ts` y `crear-pase/manejador_test.ts`.
 * No se despliega: ninguna función lo importa.
 */
import type { ContextoConAdmin, ContextoMinimo, Perfil } from './perfil.ts'

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

/** Lo que el cliente administrador falso contesta a la inserción de un pase. */
type RespuestaInsercion = { data: unknown; error: { message: string } | null }

/**
 * Crea un contexto falso con cliente administrador, para las funciones que insertan con la `service_role`.
 *
 * @param opciones lo mismo que `crearContextoFalso`, más `insercion` (lo que contesta la base al insertar)
 * e `insertadas` (opcional): arreglo donde el cliente falso guarda cada fila que se le pide insertar, para
 * que la prueba compruebe qué datos se enviaron a la base.
 */
export function crearContextoFalsoConAdmin(opciones: {
  usuario: { id: string; email?: string } | null
  respuesta: RespuestaBase
  insercion: RespuestaInsercion
  insertadas?: unknown[]
}): ContextoConAdmin {
  // Imita la cadena `from().insert().select().single()` que usa `crear-pase`.
  const insercion = {
    insert: (fila: unknown) => {
      opciones.insertadas?.push(fila)
      return insercion
    },
    select: () => insercion,
    single: () => Promise.resolve(opciones.insercion),
  }
  return {
    ...crearContextoFalso(opciones),
    supabaseAdmin: { from: () => insercion },
  } as unknown as ContextoConAdmin
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
