/**
 * Layout de las pantallas sin sesión: inicio de sesión (`login`) y registro (`registro`).
 * Solo se muestra mientras no hay rol (`Stack.Protected` en `src/app/_layout.tsx`). El login no lleva
 * barra superior; el registro sí, con flecha de volver.
 * Se usa con: `src/componentes/navegacion/opciones.tsx` (estilo de las pantallas apiladas).
 */
import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ ...opcionesPila, headerShown: false }}>
      <Stack.Screen name="registro" options={{ headerShown: true, title: 'Crear cuenta' }} />
    </Stack>
  );
}
