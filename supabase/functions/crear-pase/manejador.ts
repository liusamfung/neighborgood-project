/**
 * Lógica de la función `crear-pase` (RF15).
 *
 * Qué hace: comprueba que quien llama sea un residente con unidad, valida los datos de la visita y
 * guarda el pase con la `service_role`. Responde con el pase creado.
 * Reglas: el residente y la unidad del pase salen del perfil del token, nunca del cuerpo de la petición
 * (así nadie crea un pase a nombre de otra unidad). La fecha de la visita no puede ser anterior a hoy en
 * Lima. El estado (`vigente`) y el código (UUID v4) los pone la base de datos, no esta función.
 * Se usa con: `index.ts` (la conecta a `withSupabase`) y `manejador_test.ts`. Depende de
 * `_compartido/perfil.ts` (`exigirPerfil`), `_compartido/fechas.ts` y `_compartido/respuestas.ts`.
 */
import { esFechaValida, esHoraValida, hoyLima } from '../_compartido/fechas.ts'
import { type ContextoConAdmin, exigirPerfil } from '../_compartido/perfil.ts'
import { respuestaError } from '../_compartido/respuestas.ts'

/** Largo máximo del nombre del invitado; evita textos absurdos sin limitar nombres reales. */
const MAXIMO_NOMBRE = 100

/** Datos que la app envía en el cuerpo de la petición. */
type CuerpoPase = { nombre_visitante?: unknown; fecha_visita?: unknown; hora_estimada?: unknown }

/**
 * Atiende una llamada a `crear-pase`.
 *
 * @param req petición HTTP con el cuerpo JSON `{ nombre_visitante, fecha_visita: "YYYY-MM-DD", hora_estimada: "HH:MM" }`.
 * @param ctx contexto de la función con el cliente del llamador, su identidad y el cliente administrador.
 * @param ahora momento de referencia para saber qué día es hoy en Lima; se pasa en las pruebas.
 * @returns 201 con `{ id, nombre_visitante, fecha_visita, hora_estimada, estado, creado_en }`, o un error:
 * 400 (datos inválidos o fecha pasada), 401, 403 (sin perfil, rol o unidad) o 500.
 */
export async function manejar(
  req: Request,
  ctx: ContextoConAdmin,
  ahora: Date = new Date(),
): Promise<Response> {
  // 1. Solo un residente activo crea pases (guardia y directiva reciben 403).
  const resultado = await exigirPerfil(ctx, { roles: ['residente'] })
  if (resultado.respuesta) return resultado.respuesta
  const { perfil } = resultado

  // 2. El pase se asocia a la unidad del residente: sin unidad no hay a quién asociarlo.
  if (!perfil.unidad_id) {
    return respuestaError(
      403,
      'sin_unidad',
      'Tu cuenta no tiene un departamento asignado. Contacta a la directiva.',
    )
  }

  // 3. Leer y validar el cuerpo. Todo lo que llega del teléfono se trata como no confiable.
  const cuerpo = (await req.json().catch(() => null)) as CuerpoPase | null
  if (cuerpo === null || typeof cuerpo !== 'object') {
    return respuestaError(400, 'datos_invalidos', 'Los datos del pase no son válidos.')
  }

  const nombre = typeof cuerpo.nombre_visitante === 'string' ? cuerpo.nombre_visitante.trim() : ''
  if (nombre === '') {
    return respuestaError(400, 'datos_invalidos', 'Escribe el nombre del invitado.')
  }
  if (nombre.length > MAXIMO_NOMBRE) {
    return respuestaError(
      400,
      'datos_invalidos',
      `El nombre del invitado es muy largo (máximo ${MAXIMO_NOMBRE} letras).`,
    )
  }

  const fecha = cuerpo.fecha_visita
  if (!esFechaValida(fecha)) {
    return respuestaError(400, 'datos_invalidos', 'La fecha de la visita no es válida.')
  }
  // Las fechas YYYY-MM-DD se comparan como texto. Hoy sí se admite: el pase vale hasta las 23:59.
  if (fecha < hoyLima(ahora)) {
    return respuestaError(400, 'fecha_pasada', 'La fecha de la visita no puede ser anterior a hoy.')
  }

  const hora = cuerpo.hora_estimada
  if (!esHoraValida(hora)) {
    return respuestaError(400, 'datos_invalidos', 'La hora estimada no es válida.')
  }

  // 4. Guardar con la service_role. `estado` (vigente), `id` (gen_random_uuid) y `creado_en` los fija la
  // base de datos. La base también tiene sus propias restricciones: esta validación solo da mensajes claros.
  const { data, error } = await ctx.supabaseAdmin
    .from('pases_visita')
    .insert({
      residente_id: perfil.id,
      unidad_id: perfil.unidad_id,
      nombre_visitante: nombre,
      fecha_visita: fecha,
      hora_estimada: hora,
    })
    .select('id, nombre_visitante, fecha_visita, hora_estimada, estado, creado_en')
    .single()

  if (error) {
    // El detalle va al registro de la función (sin datos personales); el usuario ve un mensaje general.
    console.error('No se pudo crear el pase', error.message)
    return respuestaError(500, 'error_interno', 'No pudimos crear el pase. Inténtalo de nuevo.')
  }

  return Response.json(data, { status: 201 })
}
