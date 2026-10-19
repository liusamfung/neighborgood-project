import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { SesionProvider, useSesion } from '@/contexto/SesionContext';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

/**
 * Cada rol solo ve su carpeta de rutas. Es una barrera de la app: los permisos reales
 * los impone la base de datos con RLS.
 */
function Navegacion() {
  const { rol, cargando } = useSesion();

  useEffect(() => {
    if (!cargando) SplashScreen.hideAsync();
  }, [cargando]);

  // Mientras se recupera la sesión no se monta nada: así no parpadea la pantalla de login.
  if (cargando) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={rol === null}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={rol === 'residente'}>
        <Stack.Screen name="residente" />
      </Stack.Protected>
      <Stack.Protected guard={rol === 'guardia'}>
        <Stack.Screen name="guardia" />
      </Stack.Protected>
      <Stack.Protected guard={rol === 'directiva'}>
        <Stack.Screen name="directiva" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fuentesCargadas, errorFuentes] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // El splash sigue visible hasta que carguen las fuentes y la sesión.
  if (!fuentesCargadas && !errorFuentes) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SesionProvider>
        <Navegacion />
      </SesionProvider>
    </QueryClientProvider>
  );
}
