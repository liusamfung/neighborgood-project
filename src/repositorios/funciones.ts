/**
 * Repositorio de Edge Functions: llamadas de la app a las funciones de `supabase/functions/`.
 *
 * Qué hace: concentra cómo la app invoca una Edge Function y traduce sus errores a mensajes en
 * español, para que las pantallas no usen `supabase.functions` directamente (RNF7).
 * Cómo funciona: `supabase.functions.invoke` manda solo el JWT del usuario con sesión iniciada; la
 * función comprueba quién es y su rol. La app nunca lleva la `service_role`.
 * Se usa con: `src/repositorios/pases.ts` (`crear-pase`, RF15) y, más adelante, las demás pantallas del
 * pase QR (RF16 a RF22). Depende de `src/lib/supabase.ts`; `quienSoy` llama a `supabase/functions/quien-soy`.
 */
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Rol } from '@/tipos/perfil';

/** Error de una Edge Function ya traducido: `message` está listo para mostrarse al usuario. */
export class ErrorFuncion extends Error {
  /** Código HTTP de la respuesta, si la función llegó a contestar. */
  estado?: number;
  /** Código corto de la función, por ejemplo `sin_perfil`. */
  codigo?: string;

  constructor(mensaje: string, estado?: number, codigo?: string) {
    super(mensaje);
    this.name = 'ErrorFuncion';
    this.estado = estado;
    this.codigo = codigo;
  }
}

/** Respuesta de la función `quien-soy`. */
export type RespuestaQuienSoy = {
  usuario_id: string;
  correo: string | null;
  rol: Rol;
  unidad_id: string | null;
};

/**
 * Convierte un error de `supabase.functions.invoke` en un `ErrorFuncion` con texto en español.
 *
 * @param error el error que devolvió Supabase (red, relay o respuesta HTTP de la función).
 * @returns un `ErrorFuncion`; si la función mandó su propio mensaje (`mensaje`), se usa ese.
 */
async function traducirError(error: unknown): Promise<ErrorFuncion> {
  if (error instanceof FunctionsFetchError) {
    return new ErrorFuncion('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
  }
  if (error instanceof FunctionsRelayError) {
    return new ErrorFuncion('El servidor no pudo ejecutar la función. Inténtalo de nuevo.');
  }
  if (error instanceof FunctionsHttpError) {
    const respuesta = error.context as Response;
    // Las funciones de NeighborGood contestan `{ codigo, mensaje }`; las de Supabase, `{ code, message }`.
    const cuerpo = await respuesta.json().catch(() => null);
    const mensaje =
      respuesta.status === 401
        ? 'Tu sesión venció. Inicia sesión de nuevo.'
        : (cuerpo?.mensaje ?? 'La función no pudo completar la acción. Inténtalo de nuevo.');
    return new ErrorFuncion(mensaje, respuesta.status, cuerpo?.codigo ?? cuerpo?.code);
  }
  return new ErrorFuncion('No pudimos completar la acción. Inténtalo de nuevo.');
}

/**
 * Invoca una Edge Function con la sesión actual.
 *
 * @param nombre nombre de la carpeta de la función en `supabase/functions` (por ejemplo `quien-soy`).
 * @param cuerpo datos opcionales que se mandan como JSON.
 * @returns lo que responde la función, ya convertido de JSON.
 * @throws ErrorFuncion con un mensaje en español si la llamada falla.
 */
export async function invocarFuncion<T>(
  nombre: string,
  cuerpo?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(nombre, { body: cuerpo });
  if (error) throw await traducirError(error);
  return data as T;
}

/**
 * Pregunta al servidor quién es el usuario con sesión. Es la función de ejemplo del issue #6: ninguna
 * pantalla la usa, queda como referencia para probar que la app llega a las Edge Functions.
 */
export function quienSoy(): Promise<RespuestaQuienSoy> {
  return invocarFuncion<RespuestaQuienSoy>('quien-soy');
}
