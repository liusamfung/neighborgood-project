/**
 * Pruebas de `crear-pase`: la validación de los datos del pase y los rechazos por rol y por unidad.
 * Usan el contexto falso de `_compartido/contexto_falso.ts`, sin red ni base de datos. No prueban la
 * inserción real: esa se comprueba contra Supabase con la app. Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalso, perfilDeEjemplo } from '../_compartido/contexto_falso.ts'
import { type ContextoConAdmin, manejar, validarDatosPase } from './manejador.ts'

const HOY = '2026-11-11'
const usuario = { id: '90000000-0000-0000-0000-000000000011' }

/** Arma una petición POST con el cuerpo indicado. */
function peticion(cuerpo: unknown): Request {
  return new Request('http://localhost/crear-pase', { method: 'POST', body: JSON.stringify(cuerpo) })
}

Deno.test('acepta nombre, fecha de hoy y hora, y quita los espacios del nombre', () => {
  const r = validarDatosPase(
    { nombre_visitante: '  Ana Torres ', fecha_visita: HOY, hora_estimada: '18:30' },
    HOY,
  )
  assertEquals(r.datos, { nombre_visitante: 'Ana Torres', fecha_visita: HOY, hora_estimada: '18:30' })
})

Deno.test('acepta una fecha futura', () => {
  const r = validarDatosPase(
    { nombre_visitante: 'Ana Torres', fecha_visita: '2026-12-01', hora_estimada: '09:00' },
    HOY,
  )
  assertEquals(r.error, undefined)
})

Deno.test('rechaza un día pasado', () => {
  const r = validarDatosPase(
    { nombre_visitante: 'Ana Torres', fecha_visita: '2026-11-10', hora_estimada: '18:30' },
    HOY,
  )
  assertEquals(r.error, 'La fecha de la visita no puede ser un día pasado.')
})

Deno.test('rechaza una fecha que no existe', () => {
  const r = validarDatosPase(
    { nombre_visitante: 'Ana Torres', fecha_visita: '2026-02-31', hora_estimada: '18:30' },
    HOY,
  )
  assertEquals(r.error, 'La fecha de la visita no es válida.')
})

Deno.test('rechaza el nombre vacío y la hora ausente', () => {
  assertEquals(
    validarDatosPase({ nombre_visitante: ' ', fecha_visita: HOY, hora_estimada: '18:30' }, HOY).error,
    'Escribe el nombre del visitante (de 2 a 80 letras).',
  )
  assertEquals(
    validarDatosPase({ nombre_visitante: 'Ana Torres', fecha_visita: HOY }, HOY).error,
    'Indica la hora estimada de llegada.',
  )
})

Deno.test('rechaza un cuerpo vacío', () => {
  assertEquals(typeof validarDatosPase(null, HOY).error, 'string')
})

Deno.test('un guardia no puede crear pases: responde 403', async () => {
  const ctx = crearContextoFalso({
    usuario,
    respuesta: { data: perfilDeEjemplo({ rol: 'guardia', unidad_id: null }), error: null },
  }) as ContextoConAdmin
  const respuesta = await manejar(peticion({}), ctx)
  assertEquals(respuesta.status, 403)
  assertEquals((await respuesta.json()).codigo, 'rol_no_permitido')
})

Deno.test('un residente sin unidad responde 403 sin_unidad', async () => {
  const ctx = crearContextoFalso({
    usuario,
    respuesta: { data: perfilDeEjemplo({ unidad_id: null }), error: null },
  }) as ContextoConAdmin
  const respuesta = await manejar(peticion({}), ctx)
  assertEquals(respuesta.status, 403)
  assertEquals((await respuesta.json()).codigo, 'sin_unidad')
})

Deno.test('un residente con datos incompletos responde 400 antes de tocar la base', async () => {
  const ctx = crearContextoFalso({
    usuario,
    respuesta: { data: perfilDeEjemplo(), error: null },
  }) as ContextoConAdmin
  const respuesta = await manejar(peticion({ nombre_visitante: 'Ana Torres' }), ctx)
  assertEquals(respuesta.status, 400)
  assertEquals((await respuesta.json()).codigo, 'datos_invalidos')
})
