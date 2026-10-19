import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function GuardiaLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="alerta/[id]" options={{ title: 'Detalle de la alerta' }} />
    </Stack>
  );
}
