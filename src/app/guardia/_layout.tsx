/**
 * Layout del rol Guardia: una pila con las pestañas (`(tabs)`) el detalle de una alerta y las visitas de hoy con el registro de salida (RF20).
 * Solo es accesible con rol guardia (`Stack.Protected` en `src/app/_layout.tsx`).
 * Se usa con: `(tabs)/_layout.tsx` y `src/componentes/navegacion/opciones.tsx`.
 */
import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function GuardiaLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="alerta/[id]" options={{ title: 'Detalle de la alerta' }} />
      <Stack.Screen name="visitas" options={{ title: 'Visitas de hoy' }} />
    </Stack>
  );
}
