/**
 * Pruebas de las fechas de las Edge Functions (`_compartido/fechas.ts`): "hoy" en Lima y la validación
 * de fechas y horas. No necesitan red ni base de datos. Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { esFechaValida, esHoraValida, hoyLima } from './fechas.ts'

Deno.test('hoyLima: a las 03:00 UTC todavía es el día anterior en Lima (UTC-5)', () => {
  assertEquals(hoyLima(new Date('2026-11-11T03:00:00Z')), '2026-11-10')
})

Deno.test('hoyLima: a las 05:00 UTC ya empezó el día en Lima', () => {
  assertEquals(hoyLima(new Date('2026-11-11T05:00:00Z')), '2026-11-11')
})

Deno.test('hoyLima: el último minuto del día de Lima sigue siendo ese día', () => {
  // 23:59 en Lima = 04:59 UTC del día siguiente.
  assertEquals(hoyLima(new Date('2026-11-11T04:59:00Z')), '2026-11-10')
})

Deno.test('esFechaValida acepta fechas reales, incluido el 29 de febrero de un año bisiesto', () => {
  assertEquals(esFechaValida('2026-11-10'), true)
  assertEquals(esFechaValida('2028-02-29'), true)
})

Deno.test('esFechaValida rechaza días imposibles, otros formatos y valores que no son texto', () => {
  assertEquals(esFechaValida('2026-02-30'), false)
  assertEquals(esFechaValida('2027-02-29'), false)
  assertEquals(esFechaValida('2026-13-01'), false)
  assertEquals(esFechaValida('10/11/2026'), false)
  assertEquals(esFechaValida('2026-11-10T10:00:00Z'), false)
  assertEquals(esFechaValida(20261110), false)
  assertEquals(esFechaValida(null), false)
})

Deno.test('esHoraValida acepta de 00:00 a 23:59', () => {
  assertEquals(esHoraValida('00:00'), true)
  assertEquals(esHoraValida('15:30'), true)
  assertEquals(esHoraValida('23:59'), true)
})

Deno.test('esHoraValida rechaza horas imposibles y otros formatos', () => {
  assertEquals(esHoraValida('24:00'), false)
  assertEquals(esHoraValida('12:60'), false)
  assertEquals(esHoraValida('9:30'), false)
  assertEquals(esHoraValida('15:30:00'), false)
  assertEquals(esHoraValida(1530), false)
  assertEquals(esHoraValida(undefined), false)
})
