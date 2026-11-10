/**
 * Layout del rol Directiva: una pila con las pestañas (`(tabs)`) y las pantallas para crear un aviso,
 * crear una encuesta y ver sus resultados.
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
    </Stack>
  );
}
