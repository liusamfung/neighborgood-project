import { Tabs } from 'expo-router';

import { opcionesPestanas, pestana } from '@/componentes/navegacion/opciones';

export default function GuardiaTabs() {
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="alertas" options={pestana('Alertas', 'bell')} />
      <Tabs.Screen name="escaner" options={pestana('Escáner', 'camera')} />
    </Tabs>
  );
}
