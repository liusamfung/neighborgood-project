/**
 * Pruebas del manejador de `notificar-alerta` (RF25): a quién se avisa la alerta, qué push se manda y cada
 * motivo de rechazo. Usan un contexto falso, sin red ni base de datos: el perfil de quien llama sale de
 * `_compartido/contexto_falso.ts`; la alerta, los perfiles y los tokens, del cliente administrador falso de
 * este archivo; y Expo Push, de un `fetch` falso. Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalso, perfilDeEjemplo } from '../_compartido/contexto_falso.ts'
import type { ContextoConAdmin } from '../_compartido/perfil.ts'
import { type AlertaLeida, elegirDestinatarios, manejar, type PerfilDestino } from './manejador.ts'

const EMISOR = '90000000-0000-0000-0000-000000000011'
const ALERTA = '4b3c2d1e-0f9a-4b8c-8d7e-6f5a4b3c2d1e'
const TORRE_A = '10000000-0000-0000-0000-000000000001'
const TORRE_B = '10000000-0000-0000-0000-000000000002'
// La alerta se creó a las 20:00 UTC y la función se llama un minuto después.
const ahora = new Date('2026-11-23T20:01:00Z')

/** Una alerta activa recién creada por el emisor en la Torre A; se puede cambiar cualquier campo. */
function alertaDeEjemplo(cambios: Partial<AlertaLeida> = {}): AlertaLeida {
  return {
    id: ALERTA,
    emisor_id: EMISOR,
    sector_id: TORRE_A,
    tipo: 'medica',
    estado: 'activa',
    creada_en: '2026-11-23T20:00:00Z',
    unidades: { codigo: '302', sectores: { nombre: 'Torre A' } },
    ...cambios,
  }
}

/** Perfiles activos del condominio de ejemplo. */
const perfiles: PerfilDestino[] = [
  { id: EMISOR, rol: 'residente', unidades: { sector_id: TORRE_A } },
  { id: 'vecino-a', rol: 'residente', unidades: { sector_id: TORRE_A } },
  { id: 'vecino-b', rol: 'residente', unidades: { sector_id: TORRE_B } },
  { id: 'directiva', rol: 'directiva', unidades: null },
  { id: 'guardia', rol: 'guardia', unidades: null },
]

/** Lo que el cliente administrador falso contesta a cada tabla. */
type Respuestas = {
  alerta?: { data: AlertaLeida | null; error: { message: string } | null }
  perfiles?: { data: PerfilDestino[] | null; error: { message: string } | null }
  dispositivos?: { data: { expo_push_token: string }[] | null; error: { message: string } | null }
}

/**
 * Contexto de un usuario (`rol`, residente por defecto) cuyo cliente administrador contesta por tabla.
 * `buscados` recoge los `usuario_id` por los que se pidieron los tokens.
 */
function contexto(
  respuestas: Respuestas = {},
  opciones: { rol?: 'residente' | 'guardia' | 'directiva'; buscados?: unknown[] } = {},
): ContextoConAdmin {
  const porTabla: Record<string, unknown> = {
    alertas: respuestas.alerta ?? { data: alertaDeEjemplo(), error: null },
    perfiles: respuestas.perfiles ?? { data: perfiles, error: null },
    dispositivos: respuestas.dispositivos ??
      { data: [{ expo_push_token: 'ExponentPushToken[a]' }], error: null },
  }
  // Imita `from().select().eq().maybeSingle()`, `from().select().eq()` y `from().select().in()`: la cadena
  // se puede esperar directamente (es "thenable") o cerrar con `maybeSingle`.
  const desde = (tabla: string) => {
    const respuesta = Promise.resolve(porTabla[tabla])
    const cadena = {
      select: () => cadena,
      eq: () => cadena,
      in: (_columna: string, valores: unknown[]) => {
        opciones.buscados?.push(...valores)
        return cadena
      },
      maybeSingle: () => respuesta,
      then: (exito: (v: unknown) => unknown, fallo?: (e: unknown) => unknown) => respuesta.then(exito, fallo),
    }
    return cadena
  }
  const base = crearContextoFalso({
    usuario: { id: EMISOR },
    respuesta: { data: perfilDeEjemplo({ id: EMISOR, rol: opciones.rol ?? 'residente' }), error: null },
  })
  return { ...base, supabaseAdmin: { from: desde } } as unknown as ContextoConAdmin
}

/** Petición con el cuerpo dado. */
function peticion(cuerpo: unknown = { alerta_id: ALERTA }): Request {
  return new Request('http://localhost/notificar-alerta', { method: 'POST', body: JSON.stringify(cuerpo) })
}

/** `fetch` falso de Expo Push que guarda cada cuerpo enviado. */
function expoFalso(enviados: unknown[], ok = true): typeof fetch {
  return ((_url: string, init?: RequestInit) => {
    enviados.push(JSON.parse(String(init?.body)))
    return Promise.resolve(new Response('{}', { status: ok ? 200 : 500 }))
  }) as typeof fetch
}

Deno.test('elige directiva, guardias y vecinos del mismo sector, sin el emisor', () => {
  assertEquals(elegirDestinatarios(perfiles, alertaDeEjemplo()), ['vecino-a', 'directiva', 'guardia'])
})

Deno.test('un vecino de otro sector no recibe la alerta', () => {
  const ids = elegirDestinatarios(perfiles, alertaDeEjemplo({ sector_id: TORRE_B }))
  assertEquals(ids.includes('vecino-a'), false)
  assertEquals(ids.includes('vecino-b'), true)
})

Deno.test('manda el push de la alerta por el canal de alertas', async () => {
  const enviados: unknown[] = []
  const buscados: unknown[] = []
  const respuesta = await manejar(peticion(), contexto({}, { buscados }), ahora, expoFalso(enviados))
  assertEquals(respuesta.status, 200)
  assertEquals(await respuesta.json(), { avisados: 3, enviado: true })
  assertEquals(buscados, ['vecino-a', 'directiva', 'guardia'])
  assertEquals(enviados, [[{
    to: 'ExponentPushToken[a]',
    title: '🚨 Alerta médica',
    body: 'Torre A · 302. Toca para ver el detalle.',
    data: { tipo: 'alerta', alerta_id: ALERTA },
    sound: 'default',
    channelId: 'alertas',
    priority: 'high',
  }]])
})

Deno.test('si Expo falla, responde 200 con enviado en false (la alerta ya existe)', async () => {
  const respuesta = await manejar(peticion(), contexto(), ahora, expoFalso([], false))
  assertEquals(respuesta.status, 200)
  assertEquals(await respuesta.json(), { avisados: 3, enviado: false })
})

Deno.test('sin teléfonos registrados no llama a Expo', async () => {
  const enviados: unknown[] = []
  const respuesta = await manejar(
    peticion(),
    contexto({ dispositivos: { data: [], error: null } }),
    ahora,
    expoFalso(enviados),
  )
  assertEquals(await respuesta.json(), { avisados: 3, enviado: false })
  assertEquals(enviados.length, 0)
})

Deno.test('solo un residente puede pedir la difusión (403)', async () => {
  const respuesta = await manejar(peticion(), contexto({}, { rol: 'guardia' }), ahora, expoFalso([]))
  assertEquals(respuesta.status, 403)
})

Deno.test('sin un id de alerta válido responde 400', async () => {
  const respuesta = await manejar(peticion({ alerta_id: 'hola' }), contexto(), ahora, expoFalso([]))
  assertEquals(respuesta.status, 400)
})

Deno.test('una alerta ajena se contesta como inexistente (404) y no avisa a nadie', async () => {
  const enviados: unknown[] = []
  const ajena = { data: alertaDeEjemplo({ emisor_id: 'otro-residente' }), error: null }
  const respuesta = await manejar(peticion(), contexto({ alerta: ajena }), ahora, expoFalso(enviados))
  assertEquals(respuesta.status, 404)
  assertEquals(enviados.length, 0)
})

Deno.test('una alerta que ya se atiende no se vuelve a difundir (409)', async () => {
  const enCamino = { data: alertaDeEjemplo({ estado: 'en_camino' }), error: null }
  const respuesta = await manejar(peticion(), contexto({ alerta: enCamino }), ahora, expoFalso([]))
  assertEquals(respuesta.status, 409)
})

Deno.test('una alerta de hace más de 5 minutos no se difunde (409)', async () => {
  const vieja = { data: alertaDeEjemplo({ creada_en: '2026-11-23T19:50:00Z' }), error: null }
  const respuesta = await manejar(peticion(), contexto({ alerta: vieja }), ahora, expoFalso([]))
  assertEquals(respuesta.status, 409)
})

Deno.test('si no se puede leer la alerta responde 500', async () => {
  const fallo = { data: null, error: { message: 'sin conexión' } }
  const respuesta = await manejar(peticion(), contexto({ alerta: fallo }), ahora, expoFalso([]))
  assertEquals(respuesta.status, 500)
})
