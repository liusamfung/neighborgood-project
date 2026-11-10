/**
 * Cliente de Supabase de la app: el único punto de conexión con el backend.
 *
 * Qué hace: crea `supabase` con la URL y la anon key del proyecto, guarda la sesión en el llavero del
 * teléfono (SecureStore) y renueva el token solo con la app en primer plano.
 * Cómo funciona: con la anon key no se puede leer nada sin iniciar sesión; los permisos por rol los
 * imponen las políticas RLS de la base (supabase/migrations, parte 5).
 * Se usa con: `src/repositorios/sesion.ts` y `src/repositorios/perfiles.ts` (las pantallas nunca lo
 * importan). Depende de: `src/tipos/base_de_datos.ts` (tipos generados) y del `.env` (`EXPO_PUBLIC_*`).
 */
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import type { Database } from '@/tipos/base_de_datos';

// Variables del `.env` (ignorado por git). Expo las reemplaza al compilar, por eso deben escribirse
// literalmente `process.env.EXPO_PUBLIC_...` y no leerse de forma dinámica.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** false mientras no exista el .env: el cliente se crea, pero no apunta a ningún proyecto real. */
export const supabaseConfigurado = Boolean(url && anonKey);

if (!supabaseConfigurado) {
  console.warn(
    'Supabase sin configurar: copia .env.example a .env y completa EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

// La sesión se guarda en el llavero del teléfono. Los errores de escritura se registran
// en vez de romper la app: en ese caso la sesión solo dura hasta cerrar la app.
const almacenSeguro = {
  getItem: (clave: string) => SecureStore.getItemAsync(clave),
  setItem: async (clave: string, valor: string) => {
    try {
      await SecureStore.setItemAsync(clave, valor);
    } catch (error) {
      console.error('No se pudo guardar la sesión en SecureStore', error);
    }
  },
  removeItem: (clave: string) => SecureStore.deleteItemAsync(clave),
};

/**
 * Cliente tipado de Supabase. Úsalo solo desde `src/repositorios`, nunca desde una pantalla (RNF7).
 * Lleva solo la anon key: la service_role vive únicamente en las Edge Functions.
 */
// Solo la anon key: la service_role vive únicamente en las Edge Functions.
// Se usa || y no ?? porque un .env copiado de .env.example deja las variables como cadena vacía.
export const supabase = createClient<Database>(
  url || 'http://localhost',
  anonKey || 'sin-configurar',
  {
    auth: {
      storage: almacenSeguro,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// En móvil no hay pestañas: el refresco automático del token solo corre con la app en primer plano
// (se detiene en segundo plano para ahorrar batería y llamadas).
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
