/**
 * Layout del rol Directiva: una pila con las pestañas (`(tabs)`) y las pantallas para crear un aviso,
 * crear una encuesta, ver sus resultados y gestionar a los residentes (lista y alta, RF5).
 * Solo es accesible con rol directiva (`Stack.Protected` en `src/app/_layout.tsx`).
 * Se usa con: `(tabs)/_layout.tsx` y `src/componentes/navegacion/opciones.tsx`.
 */
import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function DirectivaLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="avisos/nuevo" options={{ title: 'Crear aviso' }} />
      <Stack.Screen name="encuestas/nueva" options={{ title: 'Crear encuesta' }} />
      <Stack.Screen name="encuestas/[id]/resultados" options={{ title: 'Resultados' }} />
      <Stack.Screen name="residentes/index" options={{ title: 'Residentes' }} />
      <Stack.Screen name="residentes/nuevo" options={{ title: 'Dar de alta' }} />
    </Stack>
  );
}
