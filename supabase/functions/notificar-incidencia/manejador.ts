/** RF30: procesa una fila real de la cola; solo usa sus destinatarios persistidos.
 * index.ts autentica al webhook. La reserva atómica evita reenvíos al repetir el webhook.
 * Tickets aceptados no equivalen a recepción. Guarda resultados y permite consultar recibos aparte.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

type Ticket = {
  dispositivo_id: string
  ticket?: string
  error?: string
  recibo?: unknown
}
const ENDPOINT = 'https://exp.host/--/api/v2/push/'

/** POST limitado al servicio oficial; sin reintentos automáticos ante resultado incierto. */
async function pedirExpo(ruta: string, cuerpo: unknown, token?: string) {
  const respuesta = await fetch(ENDPOINT + ruta, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15_000),
  })
  if (!respuesta.ok) throw new Error('expo_http')
  return await respuesta.json()
}

/** En modo recibos no vuelve a enviar: consulta tickets ya aceptados y conserva sus respuestas. */
export async function manejar(
  req: Request,
  admin: SupabaseClient,
  tokenExpo?: string,
): Promise<Response> {
  const cuerpo = await req.json().catch(() => null)
  const recibos = cuerpo?.modo === 'recibos'
  const id = recibos ? cuerpo?.id : cuerpo?.record?.id
  if (
    typeof id !== 'string' ||
    !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id) ||
    (!recibos &&
      (cuerpo.type !== 'INSERT' || cuerpo.schema !== 'public' ||
        cuerpo.table !== 'incidencia_notificaciones'))
  ) {
    return Response.json({ error: 'evento_invalido' }, { status: 400 })
  }
  const { data: evento, error } = await admin.from('incidencia_notificaciones')
    .select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!evento) {
    return Response.json({ error: 'evento_inexistente' }, { status: 404 })
  }
  if (recibos) {
    if (['pendiente', 'enviando'].includes(evento.estado_envio)) {
      return Response.json({ error: 'envio_en_proceso' }, { status: 409 })
    }
    const resultados = evento.resultados as Ticket[]
    const ids = resultados.flatMap((r) => r.ticket ? [r.ticket] : [])
    for (let i = 0; i < ids.length; i += 1000) {
      const respuesta = await pedirExpo('getReceipts', {
        ids: ids.slice(i, i + 1000),
      }, tokenExpo)
      for (const resultado of resultados) {
        if (resultado.ticket && respuesta.data?.[resultado.ticket]) {
          resultado.recibo = respuesta.data[resultado.ticket]
        }
      }
    }
    const { error: fallo } = await admin.from('incidencia_notificaciones')
      .update({ resultados }).eq('id', id)
    if (fallo) throw fallo
    return Response.json({
      estado: 'recibos_consultados',
      cantidad: ids.length,
    })
  }
  // El webhook no decide el usuario ni el contenido; se leen exclusivamente de la cola del trigger.
  if (evento.estado_envio !== 'pendiente') {
    return Response.json({ estado: evento.estado_envio, repetido: true })
  }
  const { data: perfil, error: errorPerfil } = await admin.from('perfiles')
    .select('activo').eq('id', evento.reportado_por).maybeSingle()
  if (errorPerfil) throw errorPerfil
  const { data: dispositivos, error: errorDispositivos } = await admin.from(
    'dispositivos',
  ).select('id,expo_push_token').eq('usuario_id', evento.reportado_por)
  if (errorDispositivos) throw errorDispositivos
  const destinos = perfil?.activo
    ? [
      ...new Map(
        (dispositivos ?? []).filter((d) =>
          /^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/.test(
            d.expo_push_token,
          )
        ).map((d) => [d.expo_push_token, d]),
      ).values(),
    ]
    : []
  const { data: reserva, error: errorReserva } = await admin.from(
    'incidencia_notificaciones',
  ).update({
    estado_envio: destinos.length ? 'enviando' : 'sin_destino',
    intentado_en: new Date().toISOString(),
  }).eq('id', id).eq('estado_envio', 'pendiente').select('id').maybeSingle()
  if (errorReserva) throw errorReserva
  if (!reserva) return Response.json({ estado: 'ya_reservado' })
  if (!destinos.length) return Response.json({ estado: 'sin_destino' })
  const resultados: Ticket[] = []
  let incertidumbre = false
  for (let i = 0; i < destinos.length; i += 100) {
    const lote = destinos.slice(i, i + 100)
    try {
      const respuesta = await pedirExpo(
        'send',
        lote.map((d) => ({
          to: d.expo_push_token,
          title: 'Actualización de tu incidencia',
          body: evento.estado === 'resuelto'
            ? 'Tu incidencia fue marcada como resuelta.'
            : 'Tu incidencia está en atención.',
          data: {
            tipo: 'incidencia',
            usuario_id: evento.reportado_por,
            id: evento.incidencia_id,
            estado: evento.estado,
            version: evento.cambio_en,
          },
          sound: 'default',
        })),
        tokenExpo,
      )
      if (
        !Array.isArray(respuesta.data) || respuesta.data.length !== lote.length
      ) throw new Error('tickets_invalidos')
      respuesta.data.forEach(
        (
          ticket: {
            status?: string
            id?: string
            details?: { error?: string }
          },
          j: number,
        ) => {
          resultados.push(
            ticket.status === 'ok' && ticket.id ? { dispositivo_id: lote[j].id, ticket: ticket.id } : {
              dispositivo_id: lote[j].id,
              error: ticket.details?.error ?? 'expo_rechazo',
            },
          )
        },
      )
    } catch {
      incertidumbre = true
      resultados.push(
        ...lote.map((d) => ({
          dispositivo_id: d.id,
          error: 'resultado_incierto_no_reenviar',
        })),
      )
    }
    // Conserva lo ya aceptado incluso si un lote posterior falla. No guarda tokens en la bitácora.
    const { error: fallo } = await admin.from('incidencia_notificaciones')
      .update({ resultados }).eq('id', id)
    if (fallo) throw fallo // permanece enviando: requiere revisión, nunca reenvío automático
    if (incertidumbre) break
  }
  const aceptados = resultados.filter((r) => r.ticket).length
  const estado = incertidumbre
    ? 'incierto'
    : aceptados === destinos.length
    ? 'aceptado'
    : aceptados
    ? 'parcial'
    : 'fallido'
  const { error: fallo } = await admin.from('incidencia_notificaciones').update(
    {
      estado_envio: estado,
      resultados,
      error_codigo: incertidumbre ? 'verificar_antes_de_reintentar' : null,
    },
  ).eq('id', id)
  if (fallo) throw fallo
  return Response.json({ estado, aceptados })
}
