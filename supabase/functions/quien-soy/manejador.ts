/**
 * Lógica de la función `quien-soy`.
 *
 * Qué hace: comprueba que el llamador tenga un perfil activo y responde con sus datos básicos. No
 * modifica nada en la base de datos.
 * Se usa con: `index.ts` (la conecta a `withSupabase`) y `manejador_test.ts`. Depende de
 * `_compartido/perfil.ts` (`exigirPerfil`).
 */
import { type ContextoMinimo, exigirPerfil } from '../_compartido/perfil.ts'

/**
 * Atiende una llamada a `quien-soy`.
 *
 * @param _req petición HTTP (no se usa: la identidad sale del token, no del cuerpo).
 * @param ctx contexto de la función con el cliente de Supabase del llamador y su identidad.
 * @returns JSON `{ usuario_id, correo, rol, unidad_id }`, o el error de `exigirPerfil` (401, 403, 500).
 */
export async function manejar(_req: Request, ctx: ContextoMinimo): Promise<Response> {
  const resultado = await exigirPerfil(ctx)
  if (resultado.respuesta) return resultado.respuesta

  const { perfil } = resultado
  return Response.json({
    usuario_id: perfil.id,
    correo: ctx.userClaims?.email ?? null,
    rol: perfil.rol,
    unidad_id: perfil.unidad_id,
  })
}
