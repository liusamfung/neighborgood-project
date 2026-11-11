/**
 * Lógica de la función `validar-pase`: el guardia valida el ingreso de una visita y registra su salida
 * (RF18, RF19, RF20, RF21).
 *
 * Qué hace: recibe el código leído del QR (el id del pase) y una acción.
 * - `ingreso`: si el pase es de hoy y está vigente, lo marca `usado` y guarda `ingreso_en` y
 *   `guardia_id` (RF19, RF20); responde "Pase válido" con el visitante, la unidad y quién autorizó
 *   (RF18) y avisa al residente por push (RF21). Si no, responde por qué: "Pase no válido o vencido", "Pase ya usado" o
 *   "Pase anulado" (RF22).
 * - `salida`: guarda `salida_en` de un pase que ya ingresó (RF20).
 * Cómo funciona: el estado "vencido" no se guarda, se calcula aquí: un pase vale solo el día de la
 * visita en `America/Lima` (regla 3 de CLAUDE.md, RNF3). Las escrituras usan el cliente administrador
 * (la app no puede tocar esas columnas) y llevan el estado esperado en el `where`, para que dos
 * escaneos simultáneos del mismo QR no ingresen dos veces.
 * Se usa con: `index.ts`, `manejador_test.ts` y la app (`src/repositorios/pases.ts` → `validarPase` y
 * `registrarSalida`). Depende de: `_compartido/perfil.ts`, `respuestas.ts`, `fechas.ts` y `push.ts`.
 */
import type { SupabaseContext } from '@supabase/server'
import { hoyEnLima } from '../_compartido/fechas.ts'
import { type ContextoMinimo, exigirPerfil } from '../_compartido/perfil.ts'
import { enviarPush } from '../_compartido/push.ts'
import { respuestaError } from '../_compartido/respuestas.ts'

/** Contexto que necesita la función: el del usuario más el cliente administrador (service_role). */
export type ContextoConAdmin = ContextoMinimo & Pick<SupabaseContext, 'supabaseAdmin'>

/** Columnas de `pases_visita` que lee la función, con la unidad y su sector. */
export type PaseLeido = {
  id: string
  residente_id: string // FK → perfiles.id
  nombre_visitante: string
  fecha_visita: string
  estado: 'vigente' | 'usado' | 'anulado'
  ingreso_en: string | null
  salida_en: string | null
  unidades: { codigo: string; sectores: { nombre: string } | null } | null
  /** Residente que creó el pase (FK → perfiles.id por `residente_id`): es quien autorizó la visita. */
  residente: { nombre: string; apellido: string } | null
}

/** Qué hacer con un pase: seguir con la escritura o rechazar con un código y un mensaje. */
export type Decision =
  | { ok: true }
  | { ok: false; estado: number; codigo: string; mensaje: string }

// Un código de QR válido es un UUID; cualquier otro texto ni se consulta en la base.
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const NO_VALIDO = {
  ok: false,
  estado: 404,
  codigo: 'pase_no_valido',
  mensaje: 'Pase no válido o vencido',
} as const satisfies Decision

/**
 * Decide si un pase puede ingresar (RF18, RF19, RF22).
 *
 * @param pase el pase leído de la base, o `null` si el código no existe.
 * @param hoy día actual en Lima, "AAAA-MM-DD".
 */
export function decidirIngreso(pase: PaseLeido | null, hoy: string): Decision {
  if (!pase) return NO_VALIDO
  // El estado guardado va primero: un pase usado o anulado se informa como tal aunque sea de otro día.
  if (pase.estado === 'anulado') {
    return { ok: false, estado: 409, codigo: 'pase_anulado', mensaje: 'Pase anulado' }
  }
  if (pase.estado === 'usado') {
    return { ok: false, estado: 409, codigo: 'pase_usado', mensaje: 'Pase ya usado' }
  }
  // Vigente pero de otro día: vencido (día pasado) o todavía no vale (día futuro).
  if (pase.fecha_visita !== hoy) return NO_VALIDO
  return { ok: true }
}

/**
 * Decide si se puede registrar la salida de un pase (RF20).
 *
 * @param pase el pase leído de la base, o `null` si el código no existe.
 */
export function decidirSalida(pase: PaseLeido | null): Decision {
  if (!pase) return NO_VALIDO
  if (pase.estado !== 'usado' || !pase.ingreso_en) {
    return {
      ok: false,
      estado: 409,
      codigo: 'sin_ingreso',
      mensaje: 'Esta visita todavía no registra su ingreso',
    }
  }
  if (pase.salida_en) {
    return {
      ok: false,
      estado: 409,
      codigo: 'salida_registrada',
      mensaje: 'La salida de esta visita ya fue registrada',
    }
  }
  return { ok: true }
}

/** Texto de la unidad con su sector, por ejemplo "Torre A · Dpto 302". */
function textoUnidad(pase: PaseLeido): string {
  if (!pase.unidades) return ''
  const sector = pase.unidades.sectores?.nombre
  return sector ? `${sector} · ${pase.unidades.codigo}` : pase.unidades.codigo
}

/** Lo que la app recibe de un pase: sin ids internos del residente. */
function resumen(pase: PaseLeido, cambios: Partial<PaseLeido> = {}) {
  const p = { ...pase, ...cambios }
  return {
    id: p.id,
    nombre_visitante: p.nombre_visitante,
    unidad: textoUnidad(p),
    autorizo: p.residente ? `${p.residente.nombre} ${p.residente.apellido}`.trim() : '',
    fecha_visita: p.fecha_visita,
    estado: p.estado,
    ingreso_en: p.ingreso_en,
    salida_en: p.salida_en,
  }
}

/**
 * Avisa al residente que su visita ingresó (RF21). Busca sus tokens en `dispositivos` y manda la
 * notificación; si no tiene tokens o el envío falla, el ingreso sigue registrado.
 */
async function notificarIngreso(ctx: ContextoConAdmin, pase: PaseLeido): Promise<void> {
  const { data, error } = await ctx.supabaseAdmin
    .from('dispositivos')
    .select('expo_push_token')
    .eq('usuario_id', pase.residente_id)
  if (error) return console.error('No se pudieron leer los dispositivos', error.message)
  const tokens = (data ?? []).map((d: { expo_push_token: string }) => d.expo_push_token)
  await enviarPush(tokens, {
    titulo: 'Tu visita ingresó',
    cuerpo: `${pase.nombre_visitante} acaba de ingresar al condominio.`,
    datos: { tipo: 'ingreso_visita', pase_id: pase.id },
  })
}

/**
 * Atiende una llamada a `validar-pase`.
 *
 * @param req petición con el cuerpo JSON `{ codigo, accion }`; `accion` es `ingreso` (por defecto) o `salida`.
 * @param ctx contexto con el cliente del llamador, su identidad y el cliente administrador.
 * @returns 200 con `{ resultado, pase }`, o un error `{ codigo, mensaje }`: 400, 401/403, 404, 409 o 500.
 */
export async function manejar(req: Request, ctx: ContextoConAdmin): Promise<Response> {
  const resultado = await exigirPerfil(ctx, { roles: ['guardia'] })
  if (resultado.respuesta) return resultado.respuesta
  const guardia = resultado.perfil

  const cuerpo = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo.trim() : ''
  const accion = cuerpo?.accion ?? 'ingreso'
  if (accion !== 'ingreso' && accion !== 'salida') {
    return respuestaError(400, 'accion_invalida', 'La acción debe ser ingreso o salida.')
  }
  if (!FORMATO_UUID.test(codigo)) {
    return respuestaError(NO_VALIDO.estado, NO_VALIDO.codigo, NO_VALIDO.mensaje)
  }

  const { data, error } = await ctx.supabaseAdmin
    .from('pases_visita')
    .select(
      // `pases_visita` apunta dos veces a `perfiles` (residente y guardia): se nombra la llave del residente.
      'id, residente_id, nombre_visitante, fecha_visita, estado, ingreso_en, salida_en, unidades(codigo, sectores(nombre)), residente:perfiles!pases_visita_residente_id_fkey(nombre, apellido)',
    )
    .eq('id', codigo)
    .maybeSingle()
  if (error) {
    console.error('No se pudo leer el pase', error.message)
    return respuestaError(500, 'error_interno', 'No pudimos validar el pase. Inténtalo de nuevo.')
  }
  const pase = data as unknown as PaseLeido | null

  const decision = accion === 'ingreso' ? decidirIngreso(pase, hoyEnLima()) : decidirSalida(pase)
  if (!decision.ok) return respuestaError(decision.estado, decision.codigo, decision.mensaje)
  // `decision.ok` garantiza que el pase existe.
  const paseValido = pase as PaseLeido
  const ahora = new Date().toISOString()

  if (accion === 'ingreso') {
    // El `where estado = 'vigente'` hace que solo gane el primer escaneo si llegan dos a la vez.
    const { data: filas, error: errorIngreso } = await ctx.supabaseAdmin
      .from('pases_visita')
      .update({ estado: 'usado', ingreso_en: ahora, guardia_id: guardia.id })
      .eq('id', paseValido.id)
      .eq('estado', 'vigente')
      .select('id')
    if (errorIngreso) {
      console.error('No se pudo registrar el ingreso', errorIngreso.message)
      return respuestaError(500, 'error_interno', 'No pudimos registrar el ingreso. Inténtalo de nuevo.')
    }
    if (!filas || filas.length === 0) return respuestaError(409, 'pase_usado', 'Pase ya usado')

    await notificarIngreso(ctx, paseValido)
    return Response.json({
      resultado: 'ingreso_registrado',
      pase: resumen(paseValido, { estado: 'usado', ingreso_en: ahora }),
    })
  }

  // Salida: `salida_en is null` evita registrar dos veces la salida.
  const { data: filas, error: errorSalida } = await ctx.supabaseAdmin
    .from('pases_visita')
    .update({ salida_en: ahora })
    .eq('id', paseValido.id)
    .eq('estado', 'usado')
    .is('salida_en', null)
    .select('id')
  if (errorSalida) {
    console.error('No se pudo registrar la salida', errorSalida.message)
    return respuestaError(500, 'error_interno', 'No pudimos registrar la salida. Inténtalo de nuevo.')
  }
  if (!filas || filas.length === 0) {
    return respuestaError(409, 'salida_registrada', 'La salida de esta visita ya fue registrada')
  }
  return Response.json({ resultado: 'salida_registrada', pase: resumen(paseValido, { salida_en: ahora }) })
}
