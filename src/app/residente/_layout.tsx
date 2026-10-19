import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function ResidenteLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="alerta/tipo" options={{ title: 'Tipo de alerta' }} />
      <Stack.Screen
        name="alerta/enviada"
        options={{ title: 'Alerta enviada', headerBackVisible: false }}
      />
      <Stack.Screen name="encuesta/[id]" options={{ title: 'Encuesta' }} />
      <Stack.Screen name="incidencias/nueva" options={{ title: 'Reportar incidencia' }} />
    </Stack>
  );
}
