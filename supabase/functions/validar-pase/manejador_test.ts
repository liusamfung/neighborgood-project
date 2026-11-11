/**
 * Pruebas de `validar-pase`: las reglas que deciden el ingreso y la salida de un pase, y los rechazos
 * por rol y por código mal formado. Cubren los mensajes de los criterios de aceptación de RF18, RF19,
 * RF20 y RF22. Usan el contexto falso de `_compartido/contexto_falso.ts`, sin red ni base de datos; la
 * escritura real se comprueba contra Supabase con la app. Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalso, perfilDeEjemplo } from '../_compartido/contexto_falso.ts'
import { hoyEnLima } from '../_compartido/fechas.ts'
import { type ContextoConAdmin, decidirIngreso, decidirSalida, manejar, type PaseLeido } from './manejador.ts'

const HOY = '2026-11-11'

/** Un pase vigente de hoy; cada prueba cambia lo que necesita. */
function pase(cambios: Partial<PaseLeido> = {}): PaseLeido {
  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    residente_id: '90000000-0000-0000-0000-000000000011',
    nombre_visitante: 'Ana Torres',
    fecha_visita: HOY,
    estado: 'vigente',
    ingreso_en: null,
    salida_en: null,
    unidades: { codigo: 'Dpto 302', sectores: { nombre: 'Torre A' } },
    residente: { nombre: 'Rosa', apellido: 'Mendoza Paredes' },
    ...cambios,
  }
}

Deno.test('RF18: un pase vigente y de hoy puede ingresar', () => {
  assertEquals(decidirIngreso(pase(), HOY), { ok: true })
})

Deno.test('RF18: un código inexistente es "Pase no válido o vencido"', () => {
  const d = decidirIngreso(null, HOY)
  assertEquals(d.ok === false && d.mensaje, 'Pase no válido o vencido')
})

Deno.test('RF18 y RNF3: un pase de ayer está vencido', () => {
  const d = decidirIngreso(pase({ fecha_visita: '2026-11-10' }), HOY)
  assertEquals(d.ok === false && d.codigo, 'pase_no_valido')
})

Deno.test('un pase de mañana todavía no vale', () => {
  const d = decidirIngreso(pase({ fecha_visita: '2026-11-12' }), HOY)
  assertEquals(d.ok === false && d.codigo, 'pase_no_valido')
})

Deno.test('RF19: el segundo escaneo responde "Pase ya usado"', () => {
  const usado = pase({ estado: 'usado', ingreso_en: '2026-11-11T15:00:00Z' })
  const d = decidirIngreso(usado, HOY)
  assertEquals(d.ok === false && d.mensaje, 'Pase ya usado')
})

Deno.test('RF22: un pase anulado responde "Pase anulado"', () => {
  const d = decidirIngreso(pase({ estado: 'anulado' }), HOY)
  assertEquals(d.ok === false && d.mensaje, 'Pase anulado')
})

Deno.test('RF20: se puede registrar la salida de una visita que ingresó', () => {
  const dentro = pase({ estado: 'usado', ingreso_en: '2026-11-11T15:00:00Z' })
  assertEquals(decidirSalida(dentro), { ok: true })
})

Deno.test('RF20: no hay salida sin ingreso ni dos salidas', () => {
  const sinIngreso = decidirSalida(pase())
  assertEquals(sinIngreso.ok === false && sinIngreso.codigo, 'sin_ingreso')
  const yaSalio = decidirSalida(
    pase({ estado: 'usado', ingreso_en: '2026-11-11T15:00:00Z', salida_en: '2026-11-11T17:00:00Z' }),
  )
  assertEquals(yaSalio.ok === false && yaSalio.codigo, 'salida_registrada')
})

Deno.test('hoyEnLima usa la zona de Lima: las 03:00 UTC todavía son el día anterior', () => {
  assertEquals(hoyEnLima(new Date('2026-11-12T03:00:00Z')), '2026-11-11')
  assertEquals(hoyEnLima(new Date('2026-11-12T06:00:00Z')), '2026-11-12')
})

Deno.test('un residente no puede validar pases: responde 403', async () => {
  const ctx = crearContextoFalso({
    usuario: { id: '90000000-0000-0000-0000-000000000011' },
    respuesta: { data: perfilDeEjemplo(), error: null },
  }) as ContextoConAdmin
  const req = new Request('http://localhost/validar-pase', {
    method: 'POST',
    body: JSON.stringify({ codigo: pase().id }),
  })
  const respuesta = await manejar(req, ctx)
  assertEquals(respuesta.status, 403)
  assertEquals((await respuesta.json()).codigo, 'rol_no_permitido')
})

Deno.test('un código que no es UUID responde 404 sin consultar la base', async () => {
  const ctx = crearContextoFalso({
    usuario: { id: '90000000-0000-0000-0000-000000000002' },
    respuesta: { data: perfilDeEjemplo({ rol: 'guardia', unidad_id: null }), error: null },
  }) as ContextoConAdmin
  const req = new Request('http://localhost/validar-pase', {
    method: 'POST',
    body: JSON.stringify({ codigo: 'hola' }),
  })
  const respuesta = await manejar(req, ctx)
  assertEquals(respuesta.status, 404)
  assertEquals((await respuesta.json()).mensaje, 'Pase no válido o vencido')
})
