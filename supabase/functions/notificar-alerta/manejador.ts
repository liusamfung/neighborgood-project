/**
 * Lógica de la función `notificar-alerta` (RF25): avisa por push una alerta de pánico recién creada a los
 * vecinos del mismo sector, a la directiva y a los guardias.
 *
 * Qué hace: el residente que acaba de emitir la alerta (RF23) llama a la función con su `alerta_id`. La
 * función comprueba que la alerta sea suya, que siga activa y que sea reciente; elige a quién avisar y
 * manda "🚨 Alerta médica · Torre A · 302" a todos sus teléfonos registrados (tabla `dispositivos`).
 * A quién se avisa (criterio del issue #35):
 * - los residentes activos cuya unidad está en el mismo sector que la alerta;
 * - toda la directiva y todos los guardias activos;
 * - nunca al propio emisor: su teléfono ya vibra y suena con RF24.
 * Cómo funciona: lee con el cliente administrador (`supabaseAdmin`), porque RLS no deja al residente ver
 * los perfiles ni los tokens de los demás. Por eso solo actúa sobre una alerta del propio llamador, activa
 * y de hace menos de `MINUTOS_VIGENCIA` minutos: así nadie puede usar la función para mandar push de una
 * alerta ajena o vieja.
 * El push es de mejor esfuerzo (`_compartido/push.ts`): si nadie tiene teléfono registrado o Expo falla,
 * la alerta ya está creada y los que tienen la app abierta la reciben igual por Realtime.
 * Por qué no un Database Webhook (diagrama 4.2): el webhook se configura a mano en el panel de Supabase y
 * necesita una clave en su cabecera. Llamar a la función desde la app es una pieza menos que configurar y
 * se prueba igual que `validar-pase`, que avisa el ingreso de la misma forma (RF21).
 * Se usa con: `index.ts` (la conecta a `withSupabase`) y `manejador_test.ts`. Depende de
 * `_compartido/perfil.ts` (`exigirPerfil`), `_compartido/respuestas.ts` y `_compartido/push.ts`.
 */
import { type ContextoConAdmin, exigirPerfil, type Rol } from '../_compartido/perfil.ts'
import { enviarPush } from '../_compartido/push.ts'
import { respuestaError } from '../_compartido/respuestas.ts'

/** Minutos después de creada la alerta en los que todavía se puede difundir. */
export const MINUTOS_VIGENCIA = 5

/** Canal de Android de las alertas: lo crea la app con importancia máxima (`src/servicios/avisoDeAlerta.ts`). */
const CANAL_ALERTAS = 'alertas'

/** Mismo formato que valida `validar-pase`: el id de la alerta es un UUID v4. */
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Columnas de `alertas` que lee la función, con la unidad de origen y el nombre de su sector. */
export type AlertaLeida = {
  id: string
  emisor_id: string // FK → perfiles.id · solo el emisor puede pedir la difusión
  sector_id: string // FK → sectores.id · los vecinos de este sector reciben el aviso
  tipo: 'medica' | 'incendio' | 'seguridad'
  estado: 'activa' | 'en_camino' | 'atendida'
  creada_en: string
  /** Unidad de origen (FK → unidades.id por `unidad_id`) con el nombre de su sector. */
  unidades: { codigo: string; sectores: { nombre: string } | null } | null
}

/** Un perfil activo con el sector de su unidad (la directiva y los guardias pueden no tener unidad). */
export type PerfilDestino = {
  id: string
  rol: Rol
  unidades: { sector_id: string } | null
}

const COLUMNAS_ALERTA =
  'id, emisor_id, sector_id, tipo, estado, creada_en, unidades(codigo, sectores(nombre))'

/** Cómo se dice cada tipo en el título del push, igual que en el aviso local de RF24. */
const NOMBRE_TIPO: Record<AlertaLeida['tipo'], string> = {
  medica: 'médica',
  incendio: 'de incendio',
  seguridad: 'de seguridad',
}

/**
 * Elige a quién avisar: directiva y guardias, más los residentes del sector de la alerta, sin el emisor.
 * Es una función pura para poder probar el criterio de aceptación sin base de datos.
 *
 * @param perfiles perfiles activos con el sector de su unidad.
 * @param alerta la alerta que se difunde (su sector y su emisor).
 * @returns los ids de perfil que deben recibir el push, sin repetir.
 */
export function elegirDestinatarios(
  perfiles: PerfilDestino[],
  alerta: Pick<AlertaLeida, 'emisor_id' | 'sector_id'>,
): string[] {
  const ids = perfiles
    .filter((p) => p.id !== alerta.emisor_id)
    .filter((p) =>
      p.rol === 'directiva' || p.rol === 'guardia' ||
      (p.rol === 'residente' && p.unidades?.sector_id === alerta.sector_id)
    )
    .map((p) => p.id)
  return [...new Set(ids)]
}

/**
 * Revisa si una alerta se puede difundir ahora.
 *
 * @param alerta la alerta leída (o `null` si no existe).
 * @param usuarioId quien llama a la función.
 * @param ahora momento de referencia; se cambia en las pruebas.
 * @returns `null` si se puede difundir; si no, la respuesta de error que se devuelve.
 */
export function revisarAlerta(alerta: AlertaLeida | null, usuarioId: string, ahora: Date): Response | null {
  // Una alerta ajena se contesta igual que una inexistente: no se revela que existe.
  if (!alerta || alerta.emisor_id !== usuarioId) {
    return respuestaError(404, 'alerta_no_encontrada', 'No encontramos tu alerta.')
  }
  if (alerta.estado !== 'activa') {
    return respuestaError(409, 'alerta_no_activa', 'La alerta ya está siendo atendida.')
  }
  const minutos = (ahora.getTime() - new Date(alerta.creada_en).getTime()) / 60_000
  if (minutos > MINUTOS_VIGENCIA) {
    return respuestaError(409, 'alerta_antigua', 'La alerta ya no es reciente.')
  }
  return null
}

/** Texto de la ubicación de la alerta: "Torre A · 302", o solo el código si la unidad no tiene sector. */
function ubicacion(alerta: AlertaLeida): string {
  const unidad = alerta.unidades
  if (!unidad) return ''
  const sector = unidad.sectores?.nombre
  return sector ? `${sector} · ${unidad.codigo}` : unidad.codigo
}

/**
 * Atiende una llamada a `notificar-alerta`.
 *
 * @param req petición HTTP con el cuerpo JSON `{ alerta_id }`.
 * @param ctx contexto de la función con el cliente del llamador, su identidad y el cliente administrador.
 * @param ahora momento de referencia para saber si la alerta es reciente; se pasa en las pruebas.
 * @param pedir función `fetch` para Expo Push; las pruebas pasan una falsa.
 * @returns 200 con `{ avisados, enviado }` (cuántas personas debían recibirla y si Expo aceptó el envío),
 * o un error `{ codigo, mensaje }`: 400, 401, 403 (no es residente), 404, 409 o 500.
 */
export async function manejar(
  req: Request,
  ctx: ContextoConAdmin,
  ahora: Date = new Date(),
  pedir: typeof fetch = fetch,
): Promise<Response> {
  // 1. Solo un residente activo emite alertas (RF23), así que solo él pide difundirlas.
  const resultado = await exigirPerfil(ctx, { roles: ['residente'] })
  if (resultado.respuesta) return resultado.respuesta
  const perfil = resultado.perfil

  // 2. El id llega de la app: se trata como texto no confiable.
  const cuerpo = (await req.json().catch(() => null)) as { alerta_id?: unknown } | null
  const alertaId = typeof cuerpo?.alerta_id === 'string' ? cuerpo.alerta_id.trim() : ''
  if (!FORMATO_UUID.test(alertaId)) {
    return respuestaError(400, 'alerta_invalida', 'Falta el código de la alerta.')
  }

  // 3. Leer la alerta y comprobar que es del llamador, activa y reciente.
  const { data: alerta, error } = await ctx.supabaseAdmin
    .from('alertas')
    .select(COLUMNAS_ALERTA)
    .eq('id', alertaId)
    .maybeSingle()
  if (error) {
    console.error('No se pudo leer la alerta', error.message)
    return respuestaError(500, 'error_interno', 'No pudimos avisar la alerta. Inténtalo de nuevo.')
  }
  // `as unknown`: el cliente sin tipos generados ve las relaciones (unidades, sectores) como arreglos,
  // pero cada alerta y cada perfil tienen una sola unidad (FK simple), así que llegan como objeto.
  const rechazo = revisarAlerta(alerta as unknown as AlertaLeida | null, perfil.id, ahora)
  if (rechazo) return rechazo
  const leida = alerta as unknown as AlertaLeida

  // 4. Perfiles activos con el sector de su unidad; el filtro por sector y rol se hace en `elegirDestinatarios`.
  // Un condominio tiene pocos cientos de perfiles: leerlos todos es más simple que dos consultas encadenadas.
  const { data: perfiles, error: fallo } = await ctx.supabaseAdmin
    .from('perfiles')
    .select('id, rol, unidades(sector_id)')
    .eq('activo', true)
  if (fallo) {
    console.error('No se pudieron leer los perfiles', fallo.message)
    return respuestaError(500, 'error_interno', 'No pudimos avisar la alerta. Inténtalo de nuevo.')
  }
  const destinatarios = elegirDestinatarios((perfiles ?? []) as unknown as PerfilDestino[], leida)
  if (destinatarios.length === 0) return Response.json({ avisados: 0, enviado: false })

  // 5. Tokens de sus teléfonos y el push. Un fallo aquí no es error para la app: la alerta ya existe.
  const { data: dispositivos, error: sinTokens } = await ctx.supabaseAdmin
    .from('dispositivos')
    .select('expo_push_token')
    .in('usuario_id', destinatarios)
  if (sinTokens) {
    console.error('No se pudieron leer los dispositivos', sinTokens.message)
    return Response.json({ avisados: destinatarios.length, enviado: false })
  }
  const tokens = (dispositivos ?? []).map((d: { expo_push_token: string }) => d.expo_push_token)
  const enviado = await enviarPush(tokens, {
    titulo: `🚨 Alerta ${NOMBRE_TIPO[leida.tipo]}`,
    cuerpo: `${ubicacion(leida)}. Toca para ver el detalle.`,
    datos: { tipo: 'alerta', alerta_id: leida.id },
    canal: CANAL_ALERTAS,
  }, pedir)
  return Response.json({ avisados: destinatarios.length, enviado })
}
