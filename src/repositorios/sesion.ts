/**
 * Repositorio de sesión: crear la cuenta, iniciar, recuperar, escuchar y cerrar la sesión con Supabase Auth.
 *
 * Qué hace: concentra todo lo que la app hace con la autenticación, para que las pantallas no usen
 * `supabase.auth` directamente. También registra cada inicio de sesión en `registros_sesion` (RF6).
 * Se usa con: `src/contexto/SesionContext.tsx` (recupera, escucha y cierra la sesión),
 * `src/app/(auth)/login.tsx` (`iniciarSesion` y `mensajeDeError`) y `src/app/(auth)/registro.tsx`
 * (`registrarse` y `mensajeDeError`).
 * Depende de: `src/lib/supabase.ts`, de las políticas de `registros_sesion` (migración 5) y del trigger
 * `trg_auth_users_crear_perfil` (migración 3), que crea el perfil del residente habilitado.
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

/** Error propio del registro: el correo ya tiene una cuenta (ver `registrarse`). */
export class CorreoYaRegistradoError extends Error {
  constructor() {
    super('El correo ya tiene una cuenta');
    this.name = 'CorreoYaRegistradoError';
  }
}

/**
 * Crea la cuenta de un residente con correo y contraseña (RF1).
 *
 * Cómo funciona: solo crea el usuario en Supabase Auth. El perfil no lo crea la app: lo crea el trigger
 * `trg_auth_users_crear_perfil` (migración 3) si el correo está en `residentes_habilitados`, con el
 * nombre y la unidad que registró la directiva. Si el correo no está habilitado no hay perfil, y
 * `SesionContext` cierra la sesión con "Tu correo no está habilitado. Contacta a la directiva".
 *
 * @param correo correo ya normalizado (minúsculas y sin espacios), igual que en `residentes_habilitados`.
 * @param contrasena contraseña elegida por el usuario (nunca se guarda ni se muestra).
 * @returns `'sesion_iniciada'` si Supabase abrió la sesión al crear la cuenta (el contexto carga el
 * perfil y la navegación cambia sola), o `'falta_confirmar'` si el proyecto exige confirmar el correo
 * antes de entrar. Lanza `CorreoYaRegistradoError` o el error de Supabase si falla.
 */
export async function registrarse(
  correo: string,
  contrasena: string,
): Promise<'sesion_iniciada' | 'falta_confirmar'> {
  const { data, error } = await supabase.auth.signUp({ email: correo, password: contrasena });
  if (error) throw error;

  // Con la confirmación de correo activada, Supabase no devuelve error si el correo ya existe (para
  // no revelar cuentas): devuelve un usuario sin identidades. Se trata como "ya registrado".
  if (data.user && data.user.identities?.length === 0) throw new CorreoYaRegistradoError();

  if (!data.session || !data.user) return 'falta_confirmar';

  // RF6: crear la cuenta también abre una sesión, así que se registra igual que en `iniciarSesion`.
  // Sin perfil (correo no habilitado) RLS rechaza la fila; no es un error para el usuario.
  const { error: errorRegistro } = await supabase
    .from('registros_sesion')
    .insert({ usuario_id: data.user.id });
  if (errorRegistro) console.warn('No se registró el inicio de sesión', errorRegistro.message);
  return 'sesion_iniciada';
}

/**
 * Traduce un error de `iniciarSesion` o de `registrarse` a un texto en español para el usuario.
 *
 * @param error lo que lanzó la función (error de Supabase Auth, de red o `CorreoYaRegistradoError`).
 * @returns un mensaje corto; los errores no previstos usan un mensaje genérico.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof CorreoYaRegistradoError) {
    return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  }
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
      case 'over_email_send_rate_limit':
        return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
      // Los siguientes solo ocurren al crear la cuenta (RF1).
      case 'user_already_exists':
      case 'email_exists':
        return 'Ese correo ya tiene una cuenta. Inicia sesión.';
      case 'weak_password':
        return 'La contraseña es muy débil. Usa al menos 6 caracteres.';
      case 'email_address_invalid':
      case 'validation_failed':
        return 'Escribe un correo válido.';
      case 'signup_disabled':
        return 'El registro está desactivado. Contacta a la directiva.';
    }
  }
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

/** Cierra la sesión actual y borra el token guardado en el teléfono. */
export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
