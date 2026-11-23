/**
 * Lógica de la función `validar-pase` (RF18 a RF21): decide si la visita del QR escaneado puede ingresar y,
 * si puede, marca el pase como usado y avisa al residente; también registra la salida de la visita.
 *
 * Acciones (campo `accion` del cuerpo; por defecto `ingreso`):
 * - `ingreso`: lo que sigue en este comentario.
 * - `salida` (RF20): guarda `salida_en` de un pase que ya ingresó y todavía no salió. La base exige que
 *   `salida_en` no sea anterior a `ingreso_en` (restricción `ck_pases_estado_coherente`).
 *
 * Qué hace: comprueba que quien llama sea un guardia activo, busca el pase por su código y, si es válido,
 * lo pasa a `usado` con la hora de ingreso y el guardia (RF19; la base exige los dos para un pase usado).
 * Responde "Pase válido" con el visitante, la unidad y el residente que lo autorizó; si no, el motivo:
 * - el código no existe, o el pase vigente no es de hoy → "Pase no válido o vencido" (RF18);
 * - el pase ya se usó → "Pase ya usado" (RF19);
 * - el residente lo anuló → "Pase anulado" (RF22).
 * Reglas: el estado "vencido" no se guarda, se calcula aquí: un pase vale solo el día de la visita en
 * `America/Lima` (regla 3 de CLAUDE.md, RNF3). Quien decide qué día es hoy es el servidor (`hoyLima`).
 * Se lee y se escribe con el cliente administrador: RLS solo deja al guardia ver los pases de hoy (sin él,
 * un pase de ayer o anulado se vería igual que un código inexistente) y la app no puede cambiar el estado.
 * La escritura lleva `estado = 'vigente'` en el `where`: si dos guardias escanean el mismo QR a la vez,
 * solo el primero lo marca y el segundo recibe "Pase ya usado".
 * Aviso al residente (RF21): con el ingreso registrado, manda un push a los teléfonos del residente que
 * creó el pase (tabla `dispositivos`). Es de mejor esfuerzo: si no tiene teléfonos registrados o Expo
 * falla, el ingreso sigue valiendo. Con la app abierta, el residente se entera además por Realtime.
 * Se usa con: `index.ts` (la conecta a `withSupabase`) y `manejador_test.ts`. Depende de
 * `_compartido/perfil.ts` (`exigirPerfil`), `_compartido/fechas.ts`, `_compartido/respuestas.ts` y
 * `_compartido/push.ts`.
 */
import { hoyLima } from '../_compartido/fechas.ts'
import { type ContextoConAdmin, exigirPerfil } from '../_compartido/perfil.ts'
import { enviarPush } from '../_compartido/push.ts'
import { respuestaError } from '../_compartido/respuestas.ts'

/** Columnas de `pases_visita` que lee la función, con la unidad, su sector y el residente que lo creó. */
export type PaseLeido = {
  id: string
  residente_id: string // FK → perfiles.id · a quién se le avisa del ingreso (RF21)
  nombre_visitante: string
  fecha_visita: string
  hora_estimada: string | null
  estado: 'vigente' | 'usado' | 'anulado'
  /** Unidad del pase (FK → unidades.id por `unidad_id`) con el nombre de su sector. */
  unidades: { codigo: string; sectores: { nombre: string } | null } | null
  /** Residente que creó el pase (FK → perfiles.id por `residente_id`): es quien autorizó la visita. */
  residente: { nombre: string; apellido: string } | null
}

/** Resultado de revisar un pase: puede ingresar, o se rechaza con un estado HTTP, un código y un mensaje. */
export type Decision =
  | { ok: true }
  | { ok: false; estado: number; codigo: string; mensaje: string }

/** Lo que la app recibe de un pase válido: datos para que el guardia reconozca la visita, sin ids internos. */
export type PaseValidado = {
  id: string
  nombre_visitante: string
  unidad: string
  autorizo: string
  fecha_visita: string
  hora_estimada: string | null
  /** Hora exacta en que quedó registrado el ingreso (ISO 8601). */
  ingreso_en: string
}

/** Lo que la app recibe al registrar una salida (RF20). */
export type SalidaRegistrada = { id: string; nombre_visitante: string; salida_en: string }

// Un código de QR válido es un UUID (lo genera Postgres con gen_random_uuid()); cualquier otro texto ni
// se consulta en la base.
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Columnas que se leen. `pases_visita` apunta dos veces a `perfiles` (residente y guardia), por eso se
// nombra la llave del residente.
export const COLUMNAS_PASE =
  'id, residente_id, nombre_visitante, fecha_visita, hora_estimada, estado, unidades(codigo, sectores(nombre)), ' +
  'residente:perfiles!pases_visita_residente_id_fkey(nombre, apellido)'

/** Rechazo de un código inexistente o de un pase que no es de hoy (texto del criterio de RF18). */
const NO_VALIDO = {
  ok: false,
  estado: 404,
  codigo: 'pase_no_valido',
  mensaje: 'Pase no válido o vencido',
} as const satisfies Decision

/**
 * Decide si un pase puede ingresar hoy.
 *
 * @param pase el pase leído de la base, o `null` si el código no existe.
 * @param hoy día actual en Lima, `YYYY-MM-DD` (de `hoyLima`).
 * @returns `{ ok: true }` o el motivo del rechazo.
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
  // Vigente pero de otro día: ya venció (día pasado) o todavía no vale (día futuro).
  if (pase.fecha_visita !== hoy) return NO_VALIDO
  return { ok: true }
}

/**
 * Decide si se puede registrar la salida de un pase (RF20): tiene que haber ingresado y no haber salido.
 *
 * @param pase el pase leído de la base (con `ingreso_en` y `salida_en`), o `null` si el código no existe.
 * @returns `{ ok: true }` o el motivo del rechazo.
 */
export function decidirSalida(
  pase: Pick<PaseLeido, 'estado'> & { ingreso_en: string | null; salida_en: string | null } | null,
): Decision {
  if (!pase) return NO_VALIDO
  if (pase.estado !== 'usado' || !pase.ingreso_en) {
    return {
      ok: false,
      estado: 409,
      codigo: 'sin_ingreso',
      mensaje: 'Esta visita todavía no registra su ingreso.',
    }
  }
  if (pase.salida_en) {
    return {
      ok: false,
      estado: 409,
      codigo: 'salida_registrada',
      mensaje: 'La salida de esta visita ya fue registrada.',
    }
  }
  return { ok: true }
}

/** Texto de la unidad con su sector, por ejemplo "Torre A · 302". */
function textoUnidad(pase: PaseLeido): string {
  if (!pase.unidades) return ''
  const sector = pase.unidades.sectores?.nombre
  return sector ? `${sector} · ${pase.unidades.codigo}` : pase.unidades.codigo
}

/**
 * Convierte el pase leído en lo que ve el guardia.
 *
 * @param pase el pase leído de la base.
 * @param ingresoEn hora del ingreso que se acaba de registrar.
 */
export function resumir(pase: PaseLeido, ingresoEn: string): PaseValidado {
  return {
    id: pase.id,
    nombre_visitante: pase.nombre_visitante,
    unidad: textoUnidad(pase),
    autorizo: pase.residente ? `${pase.residente.nombre} ${pase.residente.apellido}`.trim() : '',
    fecha_visita: pase.fecha_visita,
    hora_estimada: pase.hora_estimada,
    ingreso_en: ingresoEn,
  }
}

/**
 * Avisa al residente que su visita ingresó (RF21): busca sus tokens en `dispositivos` y manda el push.
 * Nunca lanza error: si la lectura o el envío fallan, solo queda en el registro de la función.
 *
 * @param ctx contexto con el cliente administrador (los tokens de otro usuario no se ven con RLS).
 * @param pase el pase que acaba de ingresar.
 * @param pedir función `fetch` para Expo Push; las pruebas pasan una falsa.
 */
async function notificarIngreso(ctx: ContextoConAdmin, pase: PaseLeido, pedir: typeof fetch): Promise<void> {
  try {
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
    }, pedir)
  } catch (error) {
    console.error('No se pudo avisar el ingreso', (error as Error).message)
  }
}

/**
 * Atiende una llamada a `validar-pase`.
 *
 * @param req petición HTTP con el cuerpo JSON `{ codigo, accion? }`: el texto que leyó la cámara (o el
 * `id` del pase, para la salida) y `ingreso` (por defecto) o `salida`.
 * @param ctx contexto de la función con el cliente del llamador, su identidad y el cliente administrador.
 * @param ahora momento de referencia: qué día es hoy en Lima y la hora del ingreso; se pasa en las pruebas.
 * @param pedir función `fetch` para el push del ingreso (RF21); las pruebas pasan una falsa.
 * @returns 200 con `{ resultado: 'ingreso_registrado', pase }` o `{ resultado: 'salida_registrada', pase }`,
 * o un error `{ codigo, mensaje }`: 400, 401, 403 (no es guardia), 404 (no válido o vencido), 409 (usado,
 * anulado o salida repetida) o 500.
 */
export async function manejar(
  req: Request,
  ctx: ContextoConAdmin,
  ahora: Date = new Date(),
  pedir: typeof fetch = fetch,
): Promise<Response> {
  // 1. Solo un guardia activo valida pases (residente y directiva reciben 403).
  const resultado = await exigirPerfil(ctx, { roles: ['guardia'] })
  if (resultado.respuesta) return resultado.respuesta

  // 2. El código viene de la cámara: se trata como texto no confiable.
  const cuerpo = (await req.json().catch(() => null)) as { codigo?: unknown; accion?: unknown } | null
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo.trim() : ''
  const accion = cuerpo?.accion ?? 'ingreso'
  if (accion !== 'ingreso' && accion !== 'salida') {
    return respuestaError(400, 'accion_invalida', 'La acción debe ser ingreso o salida.')
  }
  if (!FORMATO_UUID.test(codigo)) {
    return respuestaError(NO_VALIDO.estado, NO_VALIDO.codigo, NO_VALIDO.mensaje)
  }
  if (accion === 'salida') return registrarSalida(ctx, codigo, ahora)

  // 3. Buscar el pase con la service_role (ver la cabecera: hace falta para dar el motivo correcto).
  const { data, error } = await ctx.supabaseAdmin
    .from('pases_visita')
    .select(COLUMNAS_PASE)
    .eq('id', codigo)
    .maybeSingle()
  if (error) {
    // El detalle va al registro de la función (sin datos personales); el guardia ve un mensaje general.
    console.error('No se pudo leer el pase', error.message)
    return respuestaError(500, 'error_interno', 'No pudimos validar el pase. Inténtalo de nuevo.')
  }
  const pase = data as unknown as PaseLeido | null

  // 4. Decidir. `decision.ok` garantiza que el pase existe.
  const decision = decidirIngreso(pase, hoyLima(ahora))
  if (!decision.ok) return respuestaError(decision.estado, decision.codigo, decision.mensaje)
  const paseValido = pase as PaseLeido

  // 5. Marcar el pase como usado (RF19). El trigger `proteger_pase` impide que vuelva a cambiar de estado.
  const ingresoEn = ahora.toISOString()
  const { data: filas, error: errorIngreso } = await ctx.supabaseAdmin
    .from('pases_visita')
    .update({ estado: 'usado', ingreso_en: ingresoEn, guardia_id: resultado.perfil.id })
    .eq('id', paseValido.id)
    .eq('estado', 'vigente')
    .select('id')
  if (errorIngreso) {
    console.error('No se pudo registrar el ingreso', errorIngreso.message)
    return respuestaError(500, 'error_interno', 'No pudimos registrar el ingreso. Inténtalo de nuevo.')
  }
  // Ninguna fila: otro escaneo lo marcó entre la lectura y esta escritura (o el residente lo anuló).
  if (!filas || filas.length === 0) return respuestaError(409, 'pase_usado', 'Pase ya usado')

  // 6. Avisar al residente (RF21). Se espera el envío para que la función no termine antes de mandarlo.
  await notificarIngreso(ctx, paseValido, pedir)
  return Response.json({ resultado: 'ingreso_registrado', pase: resumir(paseValido, ingresoEn) })
}

/**
 * Registra la salida de una visita que ya ingresó (RF20).
 *
 * @param ctx contexto con el cliente administrador (la app no puede escribir `salida_en`).
 * @param paseId código del pase, ya comprobado como UUID.
 * @param ahora hora de la salida.
 * @returns 200 con `{ resultado: 'salida_registrada', pase }`, o 404, 409 o 500 con el motivo.
 */
async function registrarSalida(ctx: ContextoConAdmin, paseId: string, ahora: Date): Promise<Response> {
  const { data, error } = await ctx.supabaseAdmin
    .from('pases_visita')
    .select('id, nombre_visitante, estado, ingreso_en, salida_en')
    .eq('id', paseId)
    .maybeSingle()
  if (error) {
    console.error('No se pudo leer el pase', error.message)
    return respuestaError(500, 'error_interno', 'No pudimos registrar la salida. Inténtalo de nuevo.')
  }
  const pase = data as
    | {
      id: string
      nombre_visitante: string
      estado: PaseLeido['estado']
      ingreso_en: string | null
      salida_en: string | null
    }
    | null
  const decision = decidirSalida(pase)
  if (!decision.ok) return respuestaError(decision.estado, decision.codigo, decision.mensaje)

  // `salida_en is null` en el `where`: si dos guardias tocan "Registrar salida" a la vez, solo vale una.
  const salidaEn = ahora.toISOString()
  const { data: filas, error: errorSalida } = await ctx.supabaseAdmin
    .from('pases_visita')
    .update({ salida_en: salidaEn })
    .eq('id', paseId)
    .eq('estado', 'usado')
    .is('salida_en', null)
    .select('id')
  if (errorSalida) {
    console.error('No se pudo registrar la salida', errorSalida.message)
    return respuestaError(500, 'error_interno', 'No pudimos registrar la salida. Inténtalo de nuevo.')
  }
  if (!filas || filas.length === 0) {
    return respuestaError(409, 'salida_registrada', 'La salida de esta visita ya fue registrada.')
  }
  // `decision.ok` garantiza que el pase existe.
  const salida: SalidaRegistrada = {
    id: paseId,
    nombre_visitante: pase?.nombre_visitante ?? '',
    salida_en: salidaEn,
  }
  return Response.json({ resultado: 'salida_registrada', pase: salida })
}
