/**
 * Lógica de la función `crear-pase`: el residente crea un pase de visita (RF15, RF16).
 *
 * Qué hace: valida el nombre del visitante, la fecha y la hora estimada, comprueba que quien llama sea
 * un residente activo con unidad e inserta el pase en `pases_visita` en estado `vigente`. Postgres
 * genera el id con `gen_random_uuid()`: ese UUID v4 es el código único del QR (RF16); la app solo lo
 * dibuja.
 * Cómo funciona: la app no puede insertar en `pases_visita` (no tiene ese permiso, migración 5), por
 * eso la inserción usa el cliente administrador, y solo después de validar el rol y los datos. El
 * residente y la unidad salen del perfil del llamador, nunca del cuerpo de la petición.
 * Se usa con: `index.ts`, `manejador_test.ts` y la app (`src/repositorios/pases.ts` → `crearPase`).
 * Depende de: `_compartido/perfil.ts`, `_compartido/respuestas.ts` y `_compartido/fechas.ts`.
 */
import type { SupabaseContext } from '@supabase/server'
import { hoyEnLima } from '../_compartido/fechas.ts'
import { type ContextoMinimo, exigirPerfil } from '../_compartido/perfil.ts'
import { respuestaError } from '../_compartido/respuestas.ts'

/** Contexto que necesita la función: el del usuario más el cliente administrador (service_role). */
export type ContextoConAdmin = ContextoMinimo & Pick<SupabaseContext, 'supabaseAdmin'>

/** Datos de un pase ya revisados y limpios. */
export type DatosPase = {
  nombre_visitante: string
  /** Día de la visita, "AAAA-MM-DD". */
  fecha_visita: string
  /** Hora estimada de llegada, "HH:MM". */
  hora_estimada: string
}

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Revisa el cuerpo de la petición.
 *
 * @param cuerpo lo que mandó la app (puede ser cualquier cosa).
 * @param hoy día actual en Lima, "AAAA-MM-DD"; no se aceptan visitas en días pasados.
 * @returns los datos limpios, o el mensaje del primer problema encontrado.
 */
export function validarDatosPase(
  cuerpo: unknown,
  hoy: string,
): { datos: DatosPase; error?: never } | { datos?: never; error: string } {
  const c = (cuerpo ?? {}) as Record<string, unknown>
  const nombre = typeof c.nombre_visitante === 'string' ? c.nombre_visitante.trim() : ''
  const fecha = typeof c.fecha_visita === 'string' ? c.fecha_visita : ''
  const hora = typeof c.hora_estimada === 'string' ? c.hora_estimada : ''

  if (nombre.length < 2 || nombre.length > 80) {
    return { error: 'Escribe el nombre del visitante (de 2 a 80 letras).' }
  }
  // Además del formato se comprueba que el día exista (por ejemplo, no 2026-02-31).
  const dia = new Date(`${fecha}T00:00:00Z`)
  if (!FORMATO_FECHA.test(fecha) || isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== fecha) {
    return { error: 'La fecha de la visita no es válida.' }
  }
  // Los textos "AAAA-MM-DD" se comparan bien como texto.
  if (fecha < hoy) return { error: 'La fecha de la visita no puede ser un día pasado.' }
  if (!FORMATO_HORA.test(hora)) return { error: 'Indica la hora estimada de llegada.' }

  return { datos: { nombre_visitante: nombre, fecha_visita: fecha, hora_estimada: hora } }
}

/**
 * Atiende una llamada a `crear-pase`.
 *
 * @param req petición con el cuerpo JSON `{ nombre_visitante, fecha_visita, hora_estimada }`.
 * @param ctx contexto con el cliente del llamador, su identidad y el cliente administrador.
 * @returns 201 con el pase creado, o un error: 400 (datos), 401/403 (sesión, rol o sin unidad), 500.
 */
export async function manejar(req: Request, ctx: ContextoConAdmin): Promise<Response> {
  const resultado = await exigirPerfil(ctx, { roles: ['residente'] })
  if (resultado.respuesta) return resultado.respuesta
  const { perfil } = resultado
  if (!perfil.unidad_id) {
    return respuestaError(403, 'sin_unidad', 'Tu perfil no tiene una unidad asignada.')
  }

  const cuerpo = await req.json().catch(() => null)
  const validacion = validarDatosPase(cuerpo, hoyEnLima())
  if (validacion.error) return respuestaError(400, 'datos_invalidos', validacion.error)

  // Cliente administrador: única forma de insertar el pase. El id (UUID v4) lo genera Postgres.
  const { data, error } = await ctx.supabaseAdmin
    .from('pases_visita')
    .insert({ ...validacion.datos, residente_id: perfil.id, unidad_id: perfil.unidad_id })
    .select('id, nombre_visitante, fecha_visita, hora_estimada, estado, creado_en')
    .single()

  if (error) {
    console.error('No se pudo crear el pase', error.message)
    return respuestaError(500, 'error_interno', 'No pudimos crear el pase. Inténtalo de nuevo.')
  }
  return Response.json(data, { status: 201 })
}
