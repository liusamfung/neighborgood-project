import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ ...opcionesPila, headerShown: false }}>
      <Stack.Screen name="registro" options={{ headerShown: true, title: 'Crear cuenta' }} />
    </Stack>
  );
}
