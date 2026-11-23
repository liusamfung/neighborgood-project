/**
 * Barra inferior del Residente: Inicio, Avisos, Visitas, Incidencias y Perfil (5 pestañas, DISENO.md).
 * Cada pestaña es un archivo de esta carpeta; el título y el ícono salen de `pestana()`.
 * También mantiene activo `useAvisoDeIngreso` (RF21): como este layout envuelve todas las pestañas, el
 * residente ve "Tu visita ingresó" esté en la pestaña que esté. Por lo mismo mantiene `useAvisoDeAlertas`
 * (RF25): las alertas de los vecinos de su sector le llegan en cualquier pestaña.
 * Se usa con: `src/componentes/navegacion/opciones.tsx` (aspecto y función `pestana`),
 * `src/hooks/useAvisoDeIngreso.ts` y `src/hooks/useAvisoDeAlertas.ts`.
 */
import { Tabs } from 'expo-router';

import { opcionesPestanas, pestana } from '@/componentes/navegacion/opciones';
import { useAvisoDeAlertas } from '@/hooks/useAvisoDeAlertas';
import { useAvisoDeIngreso } from '@/hooks/useAvisoDeIngreso';

export default function ResidenteTabs() {
  useAvisoDeIngreso();
  useAvisoDeAlertas();
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
