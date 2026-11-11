/**
 * Layout del rol Residente: una pila con las pestañas (`(tabs)`) y las pantallas de detalle (tipo de
 * alerta, alerta enviada, encuesta y reporte de incidencia), que se abren encima de las pestañas.
 * Solo es accesible con rol residente (`Stack.Protected` en `src/app/_layout.tsx`).
 * También mantiene activo `useAvisoDeIngreso`: como este layout envuelve todas las pantallas del
 * residente, el aviso "Tu visita ingresó" (RF21) aparece en cualquiera de ellas.
 * Se usa con: `(tabs)/_layout.tsx`, `src/componentes/navegacion/opciones.tsx` y `src/hooks/usePases.ts`.
 */
import { Stack } from 'expo-router';

import { opcionesPila } from '@/componentes/navegacion/opciones';
import { useAvisoDeIngreso } from '@/hooks/usePases';

export default function ResidenteLayout() {
  // RF21 (app abierta): escucha el ingreso de las visitas mientras el residente tenga sesión.
  useAvisoDeIngreso();

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
