/**
 * Layout del rol Residente: una pila con las pestañas (`(tabs)`) y las pantallas de detalle (tipo de
 * alerta, alerta enviada, encuesta y reporte de incidencia), que se abren encima de las pestañas.
 * Solo es accesible con rol residente (`Stack.Protected` en `src/app/_layout.tsx`).
 * Se usa con: `(tabs)/_layout.tsx` y `src/componentes/navegacion/opciones.tsx`.
 */
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { AvisoIncidencia } from '@/componentes/incidencias/AvisoIncidencia';
import { useSesion } from '@/contexto/SesionContext';

import { opcionesPila } from '@/componentes/navegacion/opciones';

export default function ResidenteLayout() {
  const { perfil } = useSesion();
  return (
    <View style={{ flex: 1 }}>
      <AvisoIncidencia key={perfil?.id} />
      <Stack screenOptions={opcionesPila}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="alerta/tipo" options={{ title: 'Enviar alerta' }} />
        {/* Sin cabecera ni gesto de volver: desde "Alerta enviada" no se puede regresar a confirmar otra vez. */}
        <Stack.Screen
          name="alerta/enviada"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="encuesta/[id]" options={{ title: 'Encuesta' }} />
        <Stack.Screen name="historial" options={{ title: 'Historial' }} />
        <Stack.Screen name="resultados/[id]" options={{ title: 'Resultados' }} />
        <Stack.Screen name="resultados/index" options={{ title: 'Resultados de encuestas' }} />
        <Stack.Screen name="incidencias/nueva" options={{ title: 'Reportar incidencia' }} />
        <Stack.Screen name="alerta/historial" options={{ title: 'Mis alertas' }} />
        <Stack.Screen name="alerta/estado/[id]" options={{ title: 'Estado de alerta' }} />
      </Stack>
    </View>
  );
}
