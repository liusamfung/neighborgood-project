/**
 * Pruebas del manejador de `crear-pase` (RF15): el pase que se crea y todos los casos de error. Usan un
 * contexto falso (`_compartido/contexto_falso.ts`), sin red ni base de datos. Se ejecutan con
 * `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalsoConAdmin, perfilDeEjemplo } from '../_compartido/contexto_falso.ts'
import { manejar } from './manejador.ts'

const usuario = { id: '90000000-0000-0000-0000-000000000011', email: 'residente1@neighborgood.test' }
// 15:00 en Lima del 10 de noviembre de 2026 (20:00 UTC).
const ahora = new Date('2026-11-10T20:00:00Z')

/** Lo que la base devolvería al insertar el pase. */
const paseCreado = {
  id: '7c1f6a52-3c1e-4d6b-9a5e-0d2f6b8e9a10',
  nombre_visitante: 'Carlos Pérez',
  fecha_visita: '2026-11-10',
  hora_estimada: '18:30',
  estado: 'vigente',
  creado_en: '2026-11-10T20:00:00Z',
}

/** Petición con el cuerpo JSON indicado; por defecto, un pase válido para hoy. */
function peticion(
  cuerpo: unknown = { nombre_visitante: 'Carlos Pérez', fecha_visita: '2026-11-10', hora_estimada: '18:30' },
) {
  return new Request('http://localhost/crear-pase', {
    method: 'POST',
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  })
}

/** Contexto de un residente con perfil; `insertadas` recoge lo que la función manda a insertar. */
function contexto(
  opciones: { perfil?: ReturnType<typeof perfilDeEjemplo> | null; error?: boolean; insertadas?: unknown[] } =
    {},
) {
  return crearContextoFalsoConAdmin({
    usuario,
    respuesta: { data: opciones.perfil === undefined ? perfilDeEjemplo() : opciones.perfil, error: null },
    insercion: opciones.error
      ? { data: null, error: { message: 'detalle interno de la base' } }
      : { data: paseCreado, error: null },
    insertadas: opciones.insertadas,
  })
}

Deno.test('crea el pase y responde 201 con el pase vigente', async () => {
  const respuesta = await manejar(peticion(), contexto(), ahora)
  assertEquals(respuesta.status, 201)
  assertEquals(await respuesta.json(), paseCreado)
})

Deno.test('el residente y la unidad salen del perfil, aunque el cuerpo traiga otros', async () => {
  const insertadas: unknown[] = []
  const cuerpo = {
    nombre_visitante: '  Carlos Pérez  ',
    fecha_visita: '2026-11-10',
    hora_estimada: '18:30',
    residente_id: '99999999-9999-9999-9999-999999999999',
    unidad_id: '20000000-0000-0000-0000-000000000009',
    estado: 'usado',
  }
  const respuesta = await manejar(peticion(cuerpo), contexto({ insertadas }), ahora)
  assertEquals(respuesta.status, 201)
  // Solo se envían las columnas permitidas, con los datos del perfil y el nombre sin espacios sobrantes.
  assertEquals(insertadas, [
    {
      residente_id: '90000000-0000-0000-0000-000000000011',
      unidad_id: '20000000-0000-0000-0000-000000000001',
      nombre_visitante: 'Carlos Pérez',
      fecha_visita: '2026-11-10',
      hora_estimada: '18:30',
    },
  ])
})

Deno.test('una fecha de hoy se admite, aunque en UTC ya sea "mañana"', async () => {
  // 22:00 en Lima del 10 de noviembre = 03:00 UTC del 11. Para el residente todavía es el 10.
  const tarde = new Date('2026-11-11T03:00:00Z')
  const respuesta = await manejar(peticion(), contexto(), tarde)
  assertEquals(respuesta.status, 201)
})

Deno.test('una fecha futura se admite', async () => {
  const cuerpo = { nombre_visitante: 'Ana', fecha_visita: '2026-12-25', hora_estimada: '09:00' }
  assertEquals((await manejar(peticion(cuerpo), contexto(), ahora)).status, 201)
})

Deno.test('una fecha anterior a hoy responde 400 fecha_pasada y no inserta nada', async () => {
  const insertadas: unknown[] = []
  const cuerpo = { nombre_visitante: 'Ana', fecha_visita: '2026-11-09', hora_estimada: '09:00' }
  const respuesta = await manejar(peticion(cuerpo), contexto({ insertadas }), ahora)
  assertEquals(respuesta.status, 400)
  const json = await respuesta.json()
  assertEquals(json.codigo, 'fecha_pasada')
  assertEquals(json.mensaje, 'La fecha de la visita no puede ser anterior a hoy.')
  assertEquals(insertadas.length, 0)
})

Deno.test('fecha de "hoy" según el teléfono pero ayer en Lima se rechaza', async () => {
  // 01:00 UTC del 11 = 20:00 del día 10 en Lima; el 11 todavía no llegó, y el 9 ya pasó.
  const cuerpo = { nombre_visitante: 'Ana', fecha_visita: '2026-11-09', hora_estimada: '09:00' }
  const respuesta = await manejar(peticion(cuerpo), contexto(), new Date('2026-11-11T01:00:00Z'))
  assertEquals(respuesta.status, 400)
})

Deno.test('un nombre vacío, de solo espacios o que no es texto responde 400', async () => {
  for (const nombre of ['', '   ', null, 42]) {
    const cuerpo = { nombre_visitante: nombre, fecha_visita: '2026-11-10', hora_estimada: '18:30' }
    const respuesta = await manejar(peticion(cuerpo), contexto(), ahora)
    assertEquals(respuesta.status, 400)
    assertEquals((await respuesta.json()).mensaje, 'Escribe el nombre del invitado.')
  }
})

Deno.test('un nombre de más de 100 letras responde 400', async () => {
  const cuerpo = { nombre_visitante: 'A'.repeat(101), fecha_visita: '2026-11-10', hora_estimada: '18:30' }
  const respuesta = await manejar(peticion(cuerpo), contexto(), ahora)
  assertEquals(respuesta.status, 400)
})

Deno.test('una fecha imposible o con otro formato responde 400', async () => {
  for (const fecha of ['2026-02-30', '10/11/2026', '', null, undefined]) {
    const cuerpo = { nombre_visitante: 'Ana', fecha_visita: fecha, hora_estimada: '18:30' }
    const respuesta = await manejar(peticion(cuerpo), contexto(), ahora)
    assertEquals(respuesta.status, 400)
    assertEquals((await respuesta.json()).mensaje, 'La fecha de la visita no es válida.')
  }
})

Deno.test('una hora imposible, con otro formato o ausente responde 400', async () => {
  for (const hora of ['25:00', '18:75', '6:30', '', null, undefined]) {
    const cuerpo = { nombre_visitante: 'Ana', fecha_visita: '2026-11-10', hora_estimada: hora }
    const respuesta = await manejar(peticion(cuerpo), contexto(), ahora)
    assertEquals(respuesta.status, 400)
    assertEquals((await respuesta.json()).mensaje, 'La hora estimada no es válida.')
  }
})

Deno.test('un cuerpo que no es JSON responde 400', async () => {
  const respuesta = await manejar(peticion('esto no es json'), contexto(), ahora)
  assertEquals(respuesta.status, 400)
  assertEquals((await respuesta.json()).codigo, 'datos_invalidos')
})

Deno.test('el guardia y la directiva no crean pases: 403 rol_no_permitido', async () => {
  for (const rol of ['guardia', 'directiva'] as const) {
    const insertadas: unknown[] = []
    const perfil = perfilDeEjemplo({ rol, unidad_id: null })
    const respuesta = await manejar(peticion(), contexto({ perfil, insertadas }), ahora)
    assertEquals(respuesta.status, 403)
    assertEquals((await respuesta.json()).codigo, 'rol_no_permitido')
    assertEquals(insertadas.length, 0)
  }
})

Deno.test('un residente sin unidad responde 403 sin_unidad', async () => {
  const perfil = perfilDeEjemplo({ unidad_id: null })
  const respuesta = await manejar(peticion(), contexto({ perfil }), ahora)
  assertEquals(respuesta.status, 403)
  assertEquals((await respuesta.json()).codigo, 'sin_unidad')
})

Deno.test('un perfil inactivo o inexistente responde 403 sin_perfil', async () => {
  for (const perfil of [null, perfilDeEjemplo({ activo: false })]) {
    const respuesta = await manejar(peticion(), contexto({ perfil }), ahora)
    assertEquals(respuesta.status, 403)
    assertEquals((await respuesta.json()).codigo, 'sin_perfil')
  }
})

Deno.test('sin usuario en el token responde 401', async () => {
  const ctx = crearContextoFalsoConAdmin({
    usuario: null,
    respuesta: { data: null, error: null },
    insercion: { data: paseCreado, error: null },
  })
  assertEquals((await manejar(peticion(), ctx, ahora)).status, 401)
})

Deno.test('un error de la base responde 500 sin mostrar el detalle', async () => {
  const respuesta = await manejar(peticion(), contexto({ error: true }), ahora)
  assertEquals(respuesta.status, 500)
  const cuerpo = await respuesta.json()
  assertEquals(cuerpo.codigo, 'error_interno')
  assertEquals(JSON.stringify(cuerpo).includes('detalle interno'), false)
})
