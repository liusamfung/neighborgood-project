/**
 * Barra inferior de la Directiva: Panel, Avisos, Encuestas e Incidencias (4 pestañas, DISENO.md).
 * También mantiene activo `useAvisoDeAlertas` (RF25): una alerta nueva le llega a la directiva en
 * cualquier pestaña.
 * Se usa con: `src/componentes/navegacion/opciones.tsx` (aspecto y función `pestana`) y
 * `src/hooks/useAvisoDeAlertas.ts`.
 */
import { Tabs } from 'expo-router';

import { opcionesPestanas, pestana } from '@/componentes/navegacion/opciones';
import { useAvisoDeAlertas } from '@/hooks/useAvisoDeAlertas';

export default function DirectivaTabs() {
  useAvisoDeAlertas();
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="index" options={pestana('Panel', 'grid')} />
      <Tabs.Screen name="avisos" options={pestana('Avisos', 'message-square')} />
      <Tabs.Screen name="encuestas" options={pestana('Encuestas', 'check-square')} />
      <Tabs.Screen name="incidencias" options={pestana('Incidencias', 'alert-triangle')} />
    </Tabs>
  );
}
