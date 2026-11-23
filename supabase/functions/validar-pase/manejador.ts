/**
 * Lógica de la función `validar-pase` (RF18, RF19): decide si la visita del QR escaneado puede ingresar
 * y, si puede, marca el pase como usado.
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
 * Se usa con: `index.ts` (la conecta a `withSupabase`) y `manejador_test.ts`. Depende de
 * `_compartido/perfil.ts` (`exigirPerfil`), `_compartido/fechas.ts` y `_compartido/respuestas.ts`.
 */
import { hoyLima } from '../_compartido/fechas.ts'
import { type ContextoConAdmin, exigirPerfil } from '../_compartido/perfil.ts'
import { respuestaError } from '../_compartido/respuestas.ts'

/** Columnas de `pases_visita` que lee la función, con la unidad, su sector y el residente que lo creó. */
export type PaseLeido = {
  id: string
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

// Un código de QR válido es un UUID (lo genera Postgres con gen_random_uuid()); cualquier otro texto ni
// se consulta en la base.
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Columnas que se leen. `pases_visita` apunta dos veces a `perfiles` (residente y guardia), por eso se
// nombra la llave del residente.
export const COLUMNAS_PASE =
  'id, nombre_visitante, fecha_visita, hora_estimada, estado, unidades(codigo, sectores(nombre)), ' +
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
 * Atiende una llamada a `validar-pase`.
 *
 * @param req petición HTTP con el cuerpo JSON `{ codigo }`: el texto que leyó la cámara.
 * @param ctx contexto de la función con el cliente del llamador, su identidad y el cliente administrador.
 * @param ahora momento de referencia: qué día es hoy en Lima y la hora del ingreso; se pasa en las pruebas.
 * @returns 200 con `{ resultado: 'ingreso_registrado', pase }`, o un error `{ codigo, mensaje }`: 401, 403 (no es
 * guardia), 404 (no válido o vencido), 409 (usado o anulado) o 500.
 */
export async function manejar(
  req: Request,
  ctx: ContextoConAdmin,
  ahora: Date = new Date(),
): Promise<Response> {
  // 1. Solo un guardia activo valida pases (residente y directiva reciben 403).
  const resultado = await exigirPerfil(ctx, { roles: ['guardia'] })
  if (resultado.respuesta) return resultado.respuesta

  // 2. El código viene de la cámara: se trata como texto no confiable.
  const cuerpo = (await req.json().catch(() => null)) as { codigo?: unknown } | null
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo.trim() : ''
  if (!FORMATO_UUID.test(codigo)) {
    return respuestaError(NO_VALIDO.estado, NO_VALIDO.codigo, NO_VALIDO.mensaje)
  }

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

  return Response.json({ resultado: 'ingreso_registrado', pase: resumir(paseValido, ingresoEn) })
}
