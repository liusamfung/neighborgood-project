/**
 * Pruebas del manejador de `quien-soy`: lo que responde a un usuario con perfil y cómo propaga los
 * errores. Usan un contexto falso (`_compartido/contexto_falso.ts`), sin red ni base de datos.
 * Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalso, perfilDeEjemplo } from '../_compartido/contexto_falso.ts'
import { manejar } from './manejador.ts'

const usuario = { id: '90000000-0000-0000-0000-000000000011', email: 'residente1@neighborgood.test' }
const peticion = new Request('http://localhost/quien-soy', { method: 'POST' })

Deno.test('devuelve id, correo, rol y unidad del llamador', async () => {
  const ctx = crearContextoFalso({ usuario, respuesta: { data: perfilDeEjemplo(), error: null } })
  const respuesta = await manejar(peticion, ctx)
  assertEquals(respuesta.status, 200)
  assertEquals(await respuesta.json(), {
    usuario_id: '90000000-0000-0000-0000-000000000011',
    correo: 'residente1@neighborgood.test',
    rol: 'residente',
    unidad_id: '20000000-0000-0000-0000-000000000001',
  })
})

Deno.test('la directiva no tiene unidad: unidad_id es null', async () => {
  const perfil = perfilDeEjemplo({ rol: 'directiva', unidad_id: null })
  const ctx = crearContextoFalso({ usuario, respuesta: { data: perfil, error: null } })
  const cuerpo = await (await manejar(peticion, ctx)).json()
  assertEquals(cuerpo.rol, 'directiva')
  assertEquals(cuerpo.unidad_id, null)
})

Deno.test('sin perfil responde 403 con el mensaje de correo no habilitado', async () => {
  const ctx = crearContextoFalso({ usuario, respuesta: { data: null, error: null } })
  const respuesta = await manejar(peticion, ctx)
  assertEquals(respuesta.status, 403)
  assertEquals((await respuesta.json()).mensaje, 'Tu correo no está habilitado. Contacta a la directiva.')
})
