/**
 * Respuestas de error uniformes de las Edge Functions de NeighborGood.
 *
 * Qué hace: arma una respuesta JSON `{ codigo, mensaje }` con el estado HTTP que corresponde, para que
 * todas las funciones contesten los errores con la misma forma y la app pueda mostrarlos sin adivinar.
 * Se usa con: `_compartido/perfil.ts` y cada función (`quien-soy/manejador.ts` y las que vengan);
 * la app los lee en `src/repositorios/funciones.ts`.
 * No incluye detalles internos: ni claves, ni mensajes de la base de datos.
 */

/**
 * Crea una respuesta de error.
 *
 * @param estado código HTTP (401 sin sesión, 403 sin permiso, 500 error nuestro).
 * @param codigo identificador corto y estable para el código, por ejemplo `sin_perfil`.
 * @param mensaje texto en español que puede ver el usuario.
 */
export function respuestaError(estado: number, codigo: string, mensaje: string): Response {
  return Response.json({ codigo, mensaje }, { status: estado })
}
