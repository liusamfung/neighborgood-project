import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

// Expo reemplaza estas variables al compilar; deben escribirse literalmente.
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

// Solo la anon key: la service_role vive únicamente en las Edge Functions.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'sin-configurar', {
  auth: {
    storage: almacenSeguro,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// En móvil no hay pestañas: el refresco del token solo corre con la app en primer plano.
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
