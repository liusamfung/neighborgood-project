/** RF30: fallos de entrega, deduplicación y destinatario con frontera HTTP simulada.
 * Ejecuta el manejador real sin enviar notificaciones ni conectar a un servidor externo.
 * La base real y sus permisos se comprueban por separado en 10_notificaciones_incidencias.test.sql.
 */
import { assertEquals } from '@std/assert'
import type { SupabaseClient } from '@supabase/supabase-js'
import { manejar } from './manejador.ts'
import entrada from './index.ts'

const ID = 'b3000000-0000-0000-0000-000000000001'
type Fila = Record<string, unknown>

/** Adaptador mínimo de la frontera persistente: reserva atómica y bitácora observable. */
function base(estado = 'pendiente', dispositivos: Fila[] = []) {
  const evento: Fila = {
    id: ID,
    incidencia_id: ID,
    reportado_por: 'reportante',
    estado: 'en_atencion',
    cambio_en: '2026-11-22T12:00:00Z',
    estado_envio: estado,
    resultados: [],
  }
  const filas: Record<string, Fila[]> = {
    incidencia_notificaciones: [evento],
    perfiles: [{ id: 'reportante', activo: true }],
    dispositivos,
  }
  const admin = {
    from(tabla: string) {
      const filtros: [string, unknown][] = []
      let cambios: Fila | undefined
      const ejecutar = () => {
        const seleccion = filas[tabla].filter((f) => filtros.every(([k, v]) => f[k] === v))
        if (cambios) seleccion.forEach((f) => Object.assign(f, structuredClone(cambios)))
        return { data: structuredClone(seleccion), error: null }
      }
      const consulta = {
        select(_campos?: string) {
          return consulta
        },
        eq(k: string, v: unknown) {
          filtros.push([k, v])
          return consulta
        },
        update(v: Fila) {
          cambios = v
          return consulta
        },
        maybeSingle() {
          const r = ejecutar()
          return Promise.resolve({ data: r.data[0] ?? null, error: null })
        },
        then<T>(resolver: (r: { data: Fila[]; error: null }) => T) {
          return Promise.resolve(resolver(ejecutar()))
        },
      }
      return consulta
    },
  }
  return { admin: admin as unknown as SupabaseClient, evento }
}

/** El webhook solo aporta el id; se agregan datos falsos para comprobar que no decide destinatarios. */
function peticion(extra: Fila = {}) {
  return new Request('https://local.invalid', {
    method: 'POST',
    body: JSON.stringify({
      type: 'INSERT',
      schema: 'public',
      table: 'incidencia_notificaciones',
      record: { id: ID, reportado_por: 'atacante' },
      ...extra,
    }),
  })
}
const dispositivo = (id: string, usuario_id = 'reportante', token = id) => ({
  id,
  usuario_id,
  expo_push_token: `ExpoPushToken[${token}]`,
})

/** Sustituye solo Expo; cualquier otra conexión accidental provoca fallo del test. */
async function conExpo(probar: (llamadas: Fila[]) => Promise<void>, fallo = false) {
  const original = globalThis.fetch
  const llamadas: Fila[] = []
  globalThis.fetch = async (url, opciones) => {
    if (!String(url).startsWith('https://exp.host/--/api/v2/push/')) throw new Error('Red externa prohibida')
    const cuerpo = JSON.parse(String(opciones?.body))
    llamadas.push({ url: String(url), cuerpo })
    if (fallo) throw new TypeError('corte de red simulado')
    return Response.json({
      data: Array.isArray(cuerpo)
        ? cuerpo.map((_, i) => ({ status: 'ok', id: `ticket-${i}` }))
        : { 'ticket-0': { status: 'ok' } },
    })
  }
  try {
    await probar(llamadas)
  } finally {
    globalThis.fetch = original
  }
}

Deno.test('RF30: ignora destinatario del payload, filtra tokens ajenos y no repite el webhook', async () => {
  const bd = base('pendiente', [
    dispositivo('uno'),
    dispositivo('otro', 'atacante'),
    dispositivo('duplicado', 'reportante', 'uno'),
  ])
  await conExpo(async (llamadas) => {
    assertEquals((await manejar(peticion(), bd.admin)).status, 200)
    assertEquals(bd.evento.estado_envio, 'aceptado')
    assertEquals(llamadas.length, 1)
    const mensajes = llamadas[0].cuerpo as Fila[]
    assertEquals(mensajes.length, 1)
    assertEquals(mensajes[0].to, 'ExpoPushToken[uno]')
    assertEquals((mensajes[0].data as Fila).usuario_id, 'reportante')
    await manejar(peticion(), bd.admin)
    assertEquals(llamadas.length, 1)
  })
})
Deno.test('RF30: dos webhooks simultáneos reservan y envían una sola vez', async () => {
  const bd = base('pendiente', [dispositivo('uno')])
  await conExpo(async (llamadas) => {
    await Promise.all([manejar(peticion(), bd.admin), manejar(peticion(), bd.admin)])
    assertEquals(llamadas.length, 1)
  })
})
Deno.test('RF30: sin tokens conserva sin_destino sin hacer peticiones a Expo', async () => {
  const bd = base()
  await conExpo(async (llamadas) => {
    await manejar(peticion(), bd.admin)
    assertEquals(bd.evento.estado_envio, 'sin_destino')
    assertEquals(llamadas.length, 0)
  })
})
Deno.test('RF30: una caída conserva incierto y no reenvía al repetir', async () => {
  const bd = base('pendiente', [dispositivo('uno')])
  await conExpo(async (llamadas) => {
    await manejar(peticion(), bd.admin)
    await manejar(peticion(), bd.admin)
    assertEquals(bd.evento.estado_envio, 'incierto')
    assertEquals(llamadas.length, 1)
  }, true)
})
Deno.test('RF30: procesa 101 dispositivos en lotes de 100 y 1', async () => {
  const bd = base('pendiente', Array.from({ length: 101 }, (_, i) => dispositivo(`d${i}`)))
  await conExpo(async (llamadas) => {
    await manejar(peticion(), bd.admin)
    assertEquals(llamadas.map((l) => (l.cuerpo as unknown[]).length), [100, 1])
    assertEquals(bd.evento.estado_envio, 'aceptado')
  })
})
Deno.test('RF30: consultar recibos no vuelve a enviar y conserva la respuesta', async () => {
  const bd = base('aceptado')
  bd.evento.resultados = [{ dispositivo_id: 'uno', ticket: 'ticket-0' }]
  await conExpo(async (llamadas) => {
    await manejar(peticion({ modo: 'recibos', id: ID }), bd.admin)
    assertEquals(llamadas[0].url, 'https://exp.host/--/api/v2/push/getReceipts')
    assertEquals((bd.evento.resultados as Fila[])[0].recibo, { status: 'ok' })
  })
})
Deno.test('RF30: eventos inválidos y consultas de recibos durante envío no acceden a Expo', async () => {
  const bd = base('enviando')
  await conExpo(async (llamadas) => {
    assertEquals((await manejar(peticion({ table: 'otra' }), bd.admin)).status, 400)
    assertEquals((await manejar(peticion({ modo: 'recibos', id: ID }), bd.admin)).status, 409)
    assertEquals(llamadas.length, 0)
  })
})
Deno.test('RF30: autenticación del webhook rechaza secreto ausente o incorrecto sin red', async () => {
  const claves = ['INCIDENCIAS_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const originales = claves.map((k) => Deno.env.get(k))
  try {
    claves.forEach((k) => Deno.env.delete(k))
    assertEquals((await entrada.fetch(new Request('https://local.invalid', { method: 'POST' }))).status, 503)
    Deno.env.set(claves[0], 'secreto-sintetico-solo-test-1234567890')
    Deno.env.set(claves[1], 'https://local.invalid')
    Deno.env.set(claves[2], 'clave-sintetica-no-utilizable')
    assertEquals((await entrada.fetch(new Request('https://local.invalid', { method: 'POST' }))).status, 401)
  } finally {
    claves.forEach((k, i) => {
      if (originales[i] === undefined) Deno.env.delete(k)
      else Deno.env.set(k, originales[i]!)
    })
  }
})
