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

import { SesionProvider } from '@/contexto/SesionContext';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fuentesCargadas, errorFuentes] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const listo = fuentesCargadas || errorFuentes;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SesionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SesionProvider>
    </QueryClientProvider>
  );
}
