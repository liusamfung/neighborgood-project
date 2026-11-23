/**
 * Pruebas del manejador de `validar-pase` (RF18 a RF21): el pase válido que queda usado, el aviso al
 * residente, la salida de la visita y cada motivo de rechazo. Usan un contexto falso, sin red ni base de
 * datos: el perfil del guardia sale de `_compartido/contexto_falso.ts`; el pase leído, la escritura y los
 * tokens de `dispositivos`, del cliente administrador falso de este archivo; y Expo Push, de un `fetch`
 * falso. Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalso, perfilDeEjemplo } from '../_compartido/contexto_falso.ts'
import type { ContextoConAdmin } from '../_compartido/perfil.ts'
import { decidirIngreso, decidirSalida, manejar, type PaseLeido } from './manejador.ts'

const guardia = { id: '90000000-0000-0000-0000-000000000031', email: 'guardia1@neighborgood.test' }
const CODIGO = '7c1f6a52-3c1e-4d6b-9a5e-0d2f6b8e9a10'
// 15:00 en Lima del 10 de noviembre de 2026 (20:00 UTC).
const ahora = new Date('2026-11-10T20:00:00Z')

/** Un pase vigente de hoy; se puede cambiar cualquier campo. */
function paseDeEjemplo(cambios: Partial<PaseLeido> = {}): PaseLeido {
  return {
    id: CODIGO,
    residente_id: '90000000-0000-0000-0000-000000000011',
    nombre_visitante: 'Carlos Pérez',
    fecha_visita: '2026-11-10',
    hora_estimada: '18:30:00',
    estado: 'vigente',
    unidades: { codigo: '302', sectores: { nombre: 'Torre A' } },
    residente: { nombre: 'Rosa', apellido: 'Mendoza Paredes' },
    ...cambios,
  }
}

/** Una escritura que la función pidió: los cambios y los filtros `eq` (columna y valor). */
type Escritura = { cambios: unknown; filtros: [string, unknown][] }

/**
 * Contexto de un guardia cuyo cliente administrador contesta `lectura` a la consulta del pase y
 * `escritura` al `update`. `rol` cambia el rol del perfil que llama y `escrituras` recoge cada `update`.
 */
function contexto(
  opciones: {
    // `unknown`: la salida lee otras columnas (`ingreso_en`, `salida_en`) que el ingreso.
    lectura?: { data: PaseLeido | Record<string, unknown> | null; error: { message: string } | null }
    escritura?: { data: { id: string }[] | null; error: { message: string } | null }
    rol?: 'guardia' | 'residente' | 'directiva'
    escrituras?: Escritura[]
    /** Tokens de Expo que tiene el residente en `dispositivos` (RF21); por defecto ninguno. */
    tokens?: string[]
    /** Recoge el `usuario_id` por el que se buscaron los dispositivos. */
    buscados?: unknown[]
  } = {},
): ContextoConAdmin {
  const lectura = opciones.lectura ?? { data: paseDeEjemplo(), error: null }
  const escritura = opciones.escritura ?? { data: [{ id: CODIGO }], error: null }
  // Imita las cadenas `from().select().eq().maybeSingle()` (leer) y `from().update().eq().eq().select()`
  // (escribir; la salida suma `.is()`) que usa la función. `select` termina la escritura solo si antes hubo
  // un `update`.
  let actual: Escritura | null = null
  const consulta = {
    select: () => (actual ? Promise.resolve(escritura) : consulta),
    eq: (columna: string, valor: unknown) => {
      actual?.filtros.push([columna, valor])
      return consulta
    },
    is: (columna: string, valor: unknown) => {
      actual?.filtros.push([columna, valor])
      return consulta
    },
    update: (cambios: unknown) => {
      actual = { cambios, filtros: [] }
      opciones.escrituras?.push(actual)
      return consulta
    },
    maybeSingle: () => Promise.resolve(lectura),
  }
  const base = crearContextoFalso({
    usuario: guardia,
    respuesta: { data: perfilDeEjemplo({ id: guardia.id, rol: opciones.rol ?? 'guardia' }), error: null },
  })
  // Imita `from('dispositivos').select().eq()` del aviso de ingreso (RF21).
  const dispositivos = {
    select: () => dispositivos,
    eq: (_columna: string, valor: unknown) => {
      opciones.buscados?.push(valor)
      const data = (opciones.tokens ?? []).map((t) => ({ expo_push_token: t }))
      return Promise.resolve({ data, error: null })
    },
  }
  const supabaseAdmin = { from: (tabla: string) => (tabla === 'dispositivos' ? dispositivos : consulta) }
  return { ...base, supabaseAdmin } as unknown as ContextoConAdmin
}

/** Petición con el cuerpo JSON indicado; por defecto, el código del pase de ejemplo. */
function peticion(cuerpo: unknown = { codigo: CODIGO }) {
  return new Request('http://localhost/validar-pase', { method: 'POST', body: JSON.stringify(cuerpo) })
}

Deno.test('un pase vigente de hoy es válido y trae visitante, unidad y quién autorizó', async () => {
  const respuesta = await manejar(peticion(), contexto(), ahora)
  assertEquals(respuesta.status, 200)
  assertEquals(await respuesta.json(), {
    resultado: 'ingreso_registrado',
    pase: {
      id: CODIGO,
      nombre_visitante: 'Carlos Pérez',
      unidad: 'Torre A · 302',
      autorizo: 'Rosa Mendoza Paredes',
      fecha_visita: '2026-11-10',
      hora_estimada: '18:30:00',
      ingreso_en: '2026-11-10T20:00:00.000Z',
    },
  })
})

Deno.test('RF19: el primer escaneo válido marca el pase usado con la hora y el guardia', async () => {
  const escrituras: Escritura[] = []
  await manejar(peticion(), contexto({ escrituras }), ahora)
  assertEquals(escrituras, [{
    cambios: { estado: 'usado', ingreso_en: '2026-11-10T20:00:00.000Z', guardia_id: guardia.id },
    // `estado = vigente` en el filtro: si otro escaneo ganó, no se vuelve a marcar.
    filtros: [['id', CODIGO], ['estado', 'vigente']],
  }])
})

Deno.test('RF19: si otro escaneo lo marcó primero, responde "Pase ya usado"', async () => {
  const respuesta = await manejar(peticion(), contexto({ escritura: { data: [], error: null } }), ahora)
  assertEquals(respuesta.status, 409)
  assertEquals((await respuesta.json()).mensaje, 'Pase ya usado')
})

Deno.test('un pase rechazado no se escribe', async () => {
  const escrituras: Escritura[] = []
  const lectura = { data: paseDeEjemplo({ estado: 'usado' }), error: null }
  await manejar(peticion(), contexto({ lectura, escrituras }), ahora)
  assertEquals(escrituras, [])
})

Deno.test('si falla la escritura, responde 500 sin mostrar el detalle interno', async () => {
  const escritura = { data: null, error: { message: 'detalle interno de la base' } }
  const respuesta = await manejar(peticion(), contexto({ escritura }), ahora)
  assertEquals(respuesta.status, 500)
  assertEquals((await respuesta.json()).codigo, 'error_interno')
})

Deno.test('un código que no existe es "Pase no válido o vencido"', async () => {
  const respuesta = await manejar(peticion(), contexto({ lectura: { data: null, error: null } }), ahora)
  assertEquals(respuesta.status, 404)
  assertEquals((await respuesta.json()).mensaje, 'Pase no válido o vencido')
})

Deno.test('un texto que no es UUID se rechaza sin consultar la base', async () => {
  const respuesta = await manejar(peticion({ codigo: 'https://ejemplo.com' }), contexto(), ahora)
  assertEquals(respuesta.status, 404)
  assertEquals((await respuesta.json()).codigo, 'pase_no_valido')
})

Deno.test('un pase vigente de ayer está vencido', async () => {
  const lectura = { data: paseDeEjemplo({ fecha_visita: '2026-11-09' }), error: null }
  const respuesta = await manejar(peticion(), contexto({ lectura }), ahora)
  assertEquals(respuesta.status, 404)
  assertEquals((await respuesta.json()).mensaje, 'Pase no válido o vencido')
})

Deno.test('el día lo decide Lima: a las 23:30 de Lima ya es mañana en UTC, y el pase sigue válido', async () => {
  // 23:30 del 10 de noviembre en Lima = 04:30 UTC del 11 de noviembre.
  const respuesta = await manejar(peticion(), contexto(), new Date('2026-11-11T04:30:00Z'))
  assertEquals(respuesta.status, 200)
})

Deno.test('un pase anulado responde "Pase anulado" y uno usado "Pase ya usado"', async () => {
  const anulado = await manejar(
    peticion(),
    contexto({ lectura: { data: paseDeEjemplo({ estado: 'anulado' }), error: null } }),
    ahora,
  )
  assertEquals(anulado.status, 409)
  assertEquals((await anulado.json()).mensaje, 'Pase anulado')

  const usado = await manejar(
    peticion(),
    contexto({ lectura: { data: paseDeEjemplo({ estado: 'usado' }), error: null } }),
    ahora,
  )
  assertEquals(usado.status, 409)
  assertEquals((await usado.json()).mensaje, 'Pase ya usado')
})

Deno.test('un residente no puede validar pases', async () => {
  const respuesta = await manejar(peticion(), contexto({ rol: 'residente' }), ahora)
  assertEquals(respuesta.status, 403)
})

Deno.test('si la base falla, responde 500 sin mostrar el detalle interno', async () => {
  const lectura = { data: null, error: { message: 'detalle interno de la base' } }
  const respuesta = await manejar(peticion(), contexto({ lectura }), ahora)
  assertEquals(respuesta.status, 500)
  assertEquals((await respuesta.json()).codigo, 'error_interno')
})

Deno.test('decidirIngreso: usado o anulado de otro día se informa por su estado, no como vencido', () => {
  const ayer = '2026-11-09'
  assertEquals(decidirIngreso(paseDeEjemplo({ estado: 'usado', fecha_visita: ayer }), '2026-11-10'), {
    ok: false,
    estado: 409,
    codigo: 'pase_usado',
    mensaje: 'Pase ya usado',
  })
})

// ───────────── RF20: salida de la visita ─────────────

/** Un pase que ingresó a las 15:00 de Lima y todavía no sale. */
const paseIngresado = {
  id: CODIGO,
  nombre_visitante: 'Carlos Pérez',
  estado: 'usado',
  ingreso_en: '2026-11-10T20:00:00.000Z',
  salida_en: null,
}
// Una hora después del ingreso.
const unaHoraDespues = new Date('2026-11-10T21:00:00Z')

Deno.test('RF20: registra la salida de una visita que ya ingresó', async () => {
  const escrituras: Escritura[] = []
  const respuesta = await manejar(
    peticion({ codigo: CODIGO, accion: 'salida' }),
    contexto({ lectura: { data: paseIngresado, error: null }, escrituras }),
    unaHoraDespues,
  )
  assertEquals(respuesta.status, 200)
  assertEquals(await respuesta.json(), {
    resultado: 'salida_registrada',
    pase: { id: CODIGO, nombre_visitante: 'Carlos Pérez', salida_en: '2026-11-10T21:00:00.000Z' },
  })
  // Solo se escribe `salida_en`, y solo si sigue vacía (dos toques a la vez no la registran dos veces).
  assertEquals(escrituras, [{
    cambios: { salida_en: '2026-11-10T21:00:00.000Z' },
    filtros: [['id', CODIGO], ['estado', 'usado'], ['salida_en', null]],
  }])
})

Deno.test('RF20: no registra la salida de una visita que no ingresó', async () => {
  const lectura = { data: { ...paseIngresado, estado: 'vigente', ingreso_en: null }, error: null }
  const respuesta = await manejar(
    peticion({ codigo: CODIGO, accion: 'salida' }),
    contexto({ lectura }),
    ahora,
  )
  assertEquals(respuesta.status, 409)
  assertEquals((await respuesta.json()).codigo, 'sin_ingreso')
})

Deno.test('RF20: no registra dos veces la misma salida', async () => {
  const lectura = { data: { ...paseIngresado, salida_en: '2026-11-10T20:30:00.000Z' }, error: null }
  const respuesta = await manejar(
    peticion({ codigo: CODIGO, accion: 'salida' }),
    contexto({ lectura }),
    ahora,
  )
  assertEquals(respuesta.status, 409)
  assertEquals((await respuesta.json()).codigo, 'salida_registrada')

  // También si otro guardia la registró entre la lectura y la escritura.
  const carrera = await manejar(
    peticion({ codigo: CODIGO, accion: 'salida' }),
    contexto({ lectura: { data: paseIngresado, error: null }, escritura: { data: [], error: null } }),
    unaHoraDespues,
  )
  assertEquals(carrera.status, 409)
})

Deno.test('una acción desconocida responde 400', async () => {
  const respuesta = await manejar(peticion({ codigo: CODIGO, accion: 'borrar' }), contexto(), ahora)
  assertEquals(respuesta.status, 400)
})

Deno.test('decidirSalida: un código que no existe es "Pase no válido o vencido"', () => {
  const decision = decidirSalida(null)
  assertEquals(decision.ok, false)
})

// ───────────── RF21: aviso al residente ─────────────

/** `fetch` falso de Expo Push: guarda el cuerpo de cada envío y contesta con el estado indicado. */
function expoFalso(envios: unknown[], estado = 200): typeof fetch {
  return ((_url: string, init?: RequestInit) => {
    envios.push(JSON.parse(String(init?.body)))
    return Promise.resolve(new Response('{}', { status: estado }))
  }) as typeof fetch
}

Deno.test('RF21: al registrar el ingreso avisa por push al residente que creó el pase', async () => {
  const envios: unknown[] = []
  const buscados: unknown[] = []
  const ctx = contexto({ tokens: ['ExponentPushToken[rosa]'], buscados })
  const respuesta = await manejar(peticion(), ctx, ahora, expoFalso(envios))
  assertEquals(respuesta.status, 200)
  assertEquals(buscados, ['90000000-0000-0000-0000-000000000011'])
  assertEquals(envios, [[{
    to: 'ExponentPushToken[rosa]',
    title: 'Tu visita ingresó',
    body: 'Carlos Pérez acaba de ingresar al condominio.',
    data: { tipo: 'ingreso_visita', pase_id: CODIGO },
    sound: 'default',
  }]])
})

Deno.test('RF21: si Expo falla, el ingreso igual queda registrado', async () => {
  const ctx = contexto({ tokens: ['ExponentPushToken[rosa]'] })
  const respuesta = await manejar(peticion(), ctx, ahora, expoFalso([], 500))
  assertEquals(respuesta.status, 200)
  assertEquals((await respuesta.json()).resultado, 'ingreso_registrado')
})

Deno.test('RF21: un pase rechazado no avisa a nadie', async () => {
  const envios: unknown[] = []
  const lectura = { data: paseDeEjemplo({ estado: 'anulado' }), error: null }
  await manejar(
    peticion(),
    contexto({ lectura, tokens: ['ExponentPushToken[rosa]'] }),
    ahora,
    expoFalso(envios),
  )
  assertEquals(envios, [])
})
