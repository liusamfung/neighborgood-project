/**
 * Pruebas del manejador de `validar-pase` (RF18): el pase válido y cada motivo de rechazo. Usan un contexto
 * falso, sin red ni base de datos: el perfil del guardia sale de `_compartido/contexto_falso.ts` y el pase
 * leído, del cliente administrador falso de este archivo. Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalso, perfilDeEjemplo } from '../_compartido/contexto_falso.ts'
import type { ContextoConAdmin } from '../_compartido/perfil.ts'
import { decidirIngreso, manejar, type PaseLeido } from './manejador.ts'

const guardia = { id: '90000000-0000-0000-0000-000000000031', email: 'guardia1@neighborgood.test' }
const CODIGO = '7c1f6a52-3c1e-4d6b-9a5e-0d2f6b8e9a10'
// 15:00 en Lima del 10 de noviembre de 2026 (20:00 UTC).
const ahora = new Date('2026-11-10T20:00:00Z')

/** Un pase vigente de hoy; se puede cambiar cualquier campo. */
function paseDeEjemplo(cambios: Partial<PaseLeido> = {}): PaseLeido {
  return {
    id: CODIGO,
    nombre_visitante: 'Carlos Pérez',
    fecha_visita: '2026-11-10',
    hora_estimada: '18:30:00',
    estado: 'vigente',
    unidades: { codigo: '302', sectores: { nombre: 'Torre A' } },
    residente: { nombre: 'Rosa', apellido: 'Mendoza Paredes' },
    ...cambios,
  }
}

/**
 * Contexto de un guardia cuyo cliente administrador contesta `lectura` a la consulta del pase.
 * `rol` cambia el rol del perfil que llama.
 */
function contexto(
  opciones: {
    lectura?: { data: PaseLeido | null; error: { message: string } | null }
    rol?: 'guardia' | 'residente' | 'directiva'
  } = {},
): ContextoConAdmin {
  const lectura = opciones.lectura ?? { data: paseDeEjemplo(), error: null }
  // Imita la cadena `from().select().eq().maybeSingle()` que usa la función.
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    maybeSingle: () => Promise.resolve(lectura),
  }
  const base = crearContextoFalso({
    usuario: guardia,
    respuesta: { data: perfilDeEjemplo({ id: guardia.id, rol: opciones.rol ?? 'guardia' }), error: null },
  })
  return { ...base, supabaseAdmin: { from: () => consulta } } as unknown as ContextoConAdmin
}

/** Petición con el cuerpo JSON indicado; por defecto, el código del pase de ejemplo. */
function peticion(cuerpo: unknown = { codigo: CODIGO }) {
  return new Request('http://localhost/validar-pase', { method: 'POST', body: JSON.stringify(cuerpo) })
}

Deno.test('un pase vigente de hoy es válido y trae visitante, unidad y quién autorizó', async () => {
  const respuesta = await manejar(peticion(), contexto(), ahora)
  assertEquals(respuesta.status, 200)
  assertEquals(await respuesta.json(), {
    resultado: 'valido',
    pase: {
      id: CODIGO,
      nombre_visitante: 'Carlos Pérez',
      unidad: 'Torre A · 302',
      autorizo: 'Rosa Mendoza Paredes',
      fecha_visita: '2026-11-10',
      hora_estimada: '18:30:00',
    },
  })
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
