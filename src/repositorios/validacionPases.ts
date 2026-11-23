/**
 * Repositorio de la garita: el guardia valida el pase que escaneó (RF18).
 *
 * Qué hace: manda el código leído del QR a la Edge Function `validar-pase` y devuelve el pase válido. Si
 * la función lo rechaza ("Pase no válido o vencido", "Pase ya usado", "Pase anulado"), lanza un
 * `ErrorFuncion` cuyo `message` es ese motivo, listo para mostrarse. Las pantallas no hablan con Supabase
 * directamente (RNF7).
 * Cómo funciona: la app solo manda el texto del QR con el JWT del guardia; la función comprueba su rol y
 * decide con la hora de Lima del servidor (el teléfono no decide si un pase está vencido, regla 3).
 * Se usa con: `src/hooks/useValidarPase.ts`.
 * Depende de: `src/repositorios/funciones.ts` (`invocarFuncion`) y `supabase/functions/validar-pase`.
 */
import { invocarFuncion } from '@/repositorios/funciones';
import type { PaseValidado, RespuestaValidacion } from '@/tipos/validacionPase';

/**
 * Valida el código de un pase en la garita.
 *
 * @param codigo el texto que leyó la cámara o que escribió el guardia.
 * @returns el pase válido con el visitante, la unidad y quién lo autorizó.
 * @throws ErrorFuncion con el motivo del rechazo, o con un mensaje de conexión.
 */
export async function validarPase(codigo: string): Promise<PaseValidado> {
  const respuesta = await invocarFuncion<RespuestaValidacion>('validar-pase', {
    codigo: codigo.trim(),
  });
  return respuesta.pase;
}
