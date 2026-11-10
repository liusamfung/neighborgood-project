/**
 * Repositorio de sesión: iniciar, recuperar, escuchar y cerrar la sesión con Supabase Auth.
 *
 * Qué hace: concentra todo lo que la app hace con la autenticación, para que las pantallas no usen
 * `supabase.auth` directamente. También registra cada inicio de sesión en `registros_sesion` (RF6).
 * Se usa con: `src/contexto/SesionContext.tsx` (recupera, escucha y cierra la sesión) y
 * `src/app/(auth)/login.tsx` (`iniciarSesion` y `mensajeDeError`).
 * Depende de: `src/lib/supabase.ts` y de las políticas de `registros_sesion` (migración 5).
 */
import { isAuthApiError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/** Recupera la sesión guardada en el teléfono al abrir la app; devuelve `null` si no hay ninguna. */
export async function obtenerSesion(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Avisa de cada cambio de sesión (inicio, cierre o renovación del token).
 *
 * @param alCambiar función que recibe la sesión nueva (o `null` si se cerró).
 * @returns una función para dejar de escuchar; hay que llamarla al desmontar el componente.
 */
export function escucharSesion(alCambiar: (sesion: Session | null) => void): () => void {
  // Dentro del callback no se deben llamar otros métodos async de supabase (se bloquea).
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => alCambiar(sesion));
  return () => data.subscription.unsubscribe();
}

/**
 * Inicia sesión con correo y contraseña (RF2). Lanza el error de Supabase si falla; para
 * mostrarlo al usuario usa `mensajeDeError`.
 *
 * @param correo correo ya normalizado (minúsculas y sin espacios).
 * @param contrasena contraseña tal como la escribió el usuario (nunca se guarda ni se muestra).
 */
export async function iniciarSesion(correo: string, contrasena: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });
  if (error) throw error;

  // RF6: una fila por inicio de sesión (no por cada refresco del token). No bloquea el acceso:
  // si el usuario no tiene perfil, RLS rechaza la fila y la app lo saca con su mensaje.
  const { error: errorRegistro } = await supabase
    .from('registros_sesion')
    .insert({ usuario_id: data.user.id });
  if (errorRegistro) console.warn('No se registró el inicio de sesión', errorRegistro.message);
}

/**
 * Traduce un error de `iniciarSesion` a un texto en español para el usuario.
 *
 * @param error lo que lanzó `iniciarSesion` (error de Supabase Auth o de red).
 * @returns un mensaje corto; los errores no previstos usan un mensaje genérico.
 */
export function mensajeDeError(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  }
  if (isAuthApiError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Correo o contraseña incorrectos.';
      case 'email_not_confirmed':
        return 'Confirma tu correo antes de entrar.';
      case 'over_request_rate_limit':
        return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    }
  }
  return 'No pudimos iniciar sesión. Inténtalo de nuevo.';
}

/** Cierra la sesión actual y borra el token guardado en el teléfono. */
export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
