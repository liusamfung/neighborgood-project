/**
 * Pruebas de `exigirPerfil` (`_compartido/perfil.ts`): quién puede continuar y con qué error se rechaza
 * al que no. Usan un contexto falso, así que no necesitan red ni base de datos.
 * Se ejecutan con `npm run fn:probar`.
 */
import { assertEquals } from '@std/assert'
import { crearContextoFalso, perfilDeEjemplo } from './contexto_falso.ts'
import { exigirPerfil } from './perfil.ts'

const usuario = { id: '90000000-0000-0000-0000-000000000011', email: 'residente1@neighborgood.test' }

Deno.test('sin usuario en el token responde 401 no_autenticado', async () => {
  const ctx = crearContextoFalso({ usuario: null, respuesta: { data: null, error: null } })
  const resultado = await exigirPerfil(ctx)
  assertEquals(resultado.respuesta?.status, 401)
  assertEquals((await resultado.respuesta?.json()).codigo, 'no_autenticado')
})

Deno.test('un error de la base responde 500 sin mostrar el detalle', async () => {
  const ctx = crearContextoFalso({
    usuario,
    respuesta: { data: null, error: { message: 'detalle interno' } },
  })
  const resultado = await exigirPerfil(ctx)
  assertEquals(resultado.respuesta?.status, 500)
  const cuerpo = await resultado.respuesta?.json()
  assertEquals(cuerpo.codigo, 'error_interno')
  assertEquals(JSON.stringify(cuerpo).includes('detalle interno'), false)
})

Deno.test('un usuario sin perfil responde 403 sin_perfil', async () => {
  const ctx = crearContextoFalso({ usuario, respuesta: { data: null, error: null } })
  const resultado = await exigirPerfil(ctx)
  assertEquals(resultado.respuesta?.status, 403)
  assertEquals((await resultado.respuesta?.json()).codigo, 'sin_perfil')
})

Deno.test('un perfil inactivo responde 403 sin_perfil', async () => {
  const ctx = crearContextoFalso({
    usuario,
    respuesta: { data: perfilDeEjemplo({ activo: false }), error: null },
  })
  const resultado = await exigirPerfil(ctx)
  assertEquals(resultado.respuesta?.status, 403)
})

Deno.test('un rol no permitido responde 403 rol_no_permitido', async () => {
  const ctx = crearContextoFalso({
    usuario,
    respuesta: { data: perfilDeEjemplo({ rol: 'residente' }), error: null },
  })
  const resultado = await exigirPerfil(ctx, { roles: ['guardia'] })
  assertEquals(resultado.respuesta?.status, 403)
  assertEquals((await resultado.respuesta?.json()).codigo, 'rol_no_permitido')
})

Deno.test('un perfil activo con rol permitido devuelve el perfil', async () => {
  const ctx = crearContextoFalso({
    usuario,
    respuesta: { data: perfilDeEjemplo({ rol: 'guardia' }), error: null },
  })
  const resultado = await exigirPerfil(ctx, { roles: ['guardia', 'directiva'] })
  assertEquals(resultado.respuesta, undefined)
  assertEquals(resultado.perfil?.rol, 'guardia')
})

Deno.test('sin lista de roles, cualquier perfil activo continúa', async () => {
  const ctx = crearContextoFalso({ usuario, respuesta: { data: perfilDeEjemplo(), error: null } })
  const resultado = await exigirPerfil(ctx)
  assertEquals(resultado.perfil?.id, usuario.id)
})
