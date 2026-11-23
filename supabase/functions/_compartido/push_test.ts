/**
 * Pruebas de `enviarPush` (`_compartido/push.ts`): qué se manda a Expo y que un fallo nunca lanza error.
 * Usan un `fetch` falso, sin red. Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { enviarPush } from './push.ts'

/** Una llamada que recibió el `fetch` falso. */
type Llamada = { url: string; cuerpo: unknown }

/** `fetch` falso que guarda cada llamada en `llamadas` y contesta con el estado indicado (o falla). */
function fetchFalso(llamadas: Llamada[], estado: number | 'sin_red' = 200): typeof fetch {
  return ((url: string, init?: RequestInit) => {
    llamadas.push({ url, cuerpo: JSON.parse(String(init?.body)) })
    if (estado === 'sin_red') return Promise.reject(new Error('sin red'))
    return Promise.resolve(new Response('{}', { status: estado }))
  }) as typeof fetch
}

const mensaje = { titulo: 'Tu visita ingresó', cuerpo: 'Carlos Pérez ingresó.', datos: { pase_id: 'x' } }

Deno.test('manda un mensaje por token a Expo Push', async () => {
  const llamadas: Llamada[] = []
  const ok = await enviarPush(['ExponentPushToken[a]', 'ExponentPushToken[b]'], mensaje, fetchFalso(llamadas))
  assertEquals(ok, true)
  assertEquals(llamadas.length, 1)
  assertEquals(llamadas[0].url, 'https://exp.host/--/api/v2/push/send')
  assertEquals(llamadas[0].cuerpo, [
    {
      to: 'ExponentPushToken[a]',
      title: mensaje.titulo,
      body: mensaje.cuerpo,
      data: mensaje.datos,
      sound: 'default',
    },
    {
      to: 'ExponentPushToken[b]',
      title: mensaje.titulo,
      body: mensaje.cuerpo,
      data: mensaje.datos,
      sound: 'default',
    },
  ])
})

Deno.test('sin tokens no llama a Expo', async () => {
  const llamadas: Llamada[] = []
  assertEquals(await enviarPush([], mensaje, fetchFalso(llamadas)), false)
  assertEquals(llamadas.length, 0)
})

Deno.test('si Expo falla o no hay red, devuelve false sin lanzar error', async () => {
  assertEquals(await enviarPush(['ExponentPushToken[a]'], mensaje, fetchFalso([], 500)), false)
  assertEquals(await enviarPush(['ExponentPushToken[a]'], mensaje, fetchFalso([], 'sin_red')), false)
})

Deno.test('con canal, va por ese canal de Android y con prioridad alta (RF25)', async () => {
  const llamadas: Llamada[] = []
  await enviarPush(['ExponentPushToken[a]'], { ...mensaje, canal: 'alertas' }, fetchFalso(llamadas))
  const [enviado] = llamadas[0].cuerpo as Record<string, unknown>[]
  assertEquals(enviado.channelId, 'alertas')
  assertEquals(enviado.priority, 'high')
})
