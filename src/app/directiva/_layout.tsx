import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function DirectivaLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="avisos/nuevo" options={{ title: 'Crear aviso' }} />
      <Stack.Screen name="encuestas/nueva" options={{ title: 'Crear encuesta' }} />
      <Stack.Screen name="encuestas/[id]/resultados" options={{ title: 'Resultados' }} />
    </Stack>
  );
}
