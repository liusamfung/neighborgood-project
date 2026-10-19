import { Tabs } from 'expo-router';

import { opcionesPestanas, pestana } from '@/componentes/navegacion/opciones';

export default function DirectivaTabs() {
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="index" options={pestana('Panel', 'grid')} />
      <Tabs.Screen name="avisos" options={pestana('Avisos', 'message-square')} />
      <Tabs.Screen name="encuestas" options={pestana('Encuestas', 'check-square')} />
      <Tabs.Screen name="incidencias" options={pestana('Incidencias', 'alert-triangle')} />
    </Tabs>
  );
}
