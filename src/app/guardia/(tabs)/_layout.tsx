/**
 * Barra inferior del Guardia: Alertas y Escáner (2 pestañas, DISENO.md).
 * También mantiene activo `useAvisoDeAlertas` (RF25): como este layout envuelve las dos pestañas, una
 * alerta nueva le llega al guardia aunque esté escaneando un pase.
 * Se usa con: `src/componentes/navegacion/opciones.tsx` (aspecto y función `pestana`) y
 * `src/hooks/useAvisoDeAlertas.ts`.
 */
import { Tabs } from 'expo-router';

import { opcionesPestanas, pestana } from '@/componentes/navegacion/opciones';
import { useAvisoDeAlertas } from '@/hooks/useAvisoDeAlertas';

export default function GuardiaTabs() {
  useAvisoDeAlertas();
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="alertas" options={pestana('Alertas', 'bell')} />
      <Tabs.Screen name="escaner" options={pestana('Escáner', 'camera')} />
    </Tabs>
  );
}
