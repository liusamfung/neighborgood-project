import { Tabs } from 'expo-router';

import { opcionesPestanas, pestana } from '@/componentes/navegacion/opciones';

export default function ResidenteTabs() {
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="index" options={pestana('Inicio', 'home')} />
      <Tabs.Screen name="avisos" options={pestana('Avisos', 'message-square')} />
      <Tabs.Screen name="visitas" options={pestana('Visitas', 'user-check')} />
      <Tabs.Screen name="incidencias" options={pestana('Incidencias', 'alert-triangle')} />
      <Tabs.Screen name="perfil" options={pestana('Perfil', 'user')} />
    </Tabs>
  );
}
