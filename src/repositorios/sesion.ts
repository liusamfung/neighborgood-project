import type { Session } from '@supabase/supabase-js';

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

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
