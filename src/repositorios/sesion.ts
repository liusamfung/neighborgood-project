import { isAuthApiError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export async function obtenerSesion(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Avisa de cada cambio de sesión; devuelve la función para dejar de escuchar. */
export function escucharSesion(alCambiar: (sesion: Session | null) => void): () => void {
  // Dentro del callback no se deben llamar otros métodos async de supabase (se bloquea).
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => alCambiar(sesion));
  return () => data.subscription.unsubscribe();
}

/**
 * Inicia sesión con correo y contraseña (RF2). Lanza el error de Supabase si falla; para
 * mostrarlo al usuario usa `mensajeDeError`.
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

/** Texto en español para el usuario a partir de un error de `iniciarSesion`. */
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

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
