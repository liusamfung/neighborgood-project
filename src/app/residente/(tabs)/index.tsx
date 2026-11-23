/**
 * Ruta `/residente` (rol Residente): pantalla P2 · Inicio del mockup (RF23, Sprint 5).
 *
 * Qué hace: saluda al residente por su nombre, muestra su ubicación (sector y unidad, por ejemplo
 * "Torre A · 302") y pone a la vista la tarjeta roja del botón de pánico. Tocar "Enviar alerta de
 * emergencia" abre P3 (`/residente/alerta/tipo`): es el primer toque de los tres que pide RNF4.
 * Alcance: por decisión de Liu, esta versión solo lleva saludo, unidad y botón de pánico; las tarjetas del
 * mockup con el último aviso, la encuesta abierta y el pase de hoy no son parte de ningún requisito y quedan
 * para después.
 * Se usa con: la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña Inicio.
 * Depende de: `useSesion` (nombre y unidad del perfil), `useUbicacion` (`src/hooks/useEmitirAlerta.ts`),
 * `TarjetaPanico` y `textoUbicacion` (`src/utilidades/alertaEmergencia.ts`).
 */
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TarjetaPanico } from '@/componentes/alertas/TarjetaPanico';
import { useSesion } from '@/contexto/SesionContext';
import { useUbicacion } from '@/hooks/useEmitirAlerta';
import { colores, espacios, tipografia } from '@/tema';
import { textoUbicacion } from '@/utilidades/alertaEmergencia';

/** P2 · Inicio del residente: saludo, ubicación y botón de pánico. */
export default function Inicio() {
  const router = useRouter();
  // Alto de la barra de estado (hora, batería) para que el saludo no quede debajo de ella.
  const { top } = useSafeAreaInsets();
  const { perfil } = useSesion();
  const ubicacion = useUbicacion(perfil?.unidad_id);
  const textoUnidad = textoUbicacion(ubicacion.data);

  return (
    <View style={[estilos.pantalla, { paddingTop: top + espacios.margenLateral }]}>
      <Text style={estilos.saludo}>{perfil?.nombre ? `Hola, ${perfil.nombre}` : 'Hola'}</Text>
      {textoUnidad ? <Text style={estilos.unidad}>{textoUnidad}</Text> : null}
      <View style={estilos.panico}>
        <TarjetaPanico alPresionar={() => router.push('/residente/alerta/tipo')} />
      </View>
    </View>
  );
}

// Fondo y márgenes como las demás pestañas del residente (ver `avisos.tsx`).
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo, paddingHorizontal: espacios.margenLateral },
  saludo: { ...tipografia.titulo, fontSize: 28, color: colores.texto },
  unidad: { ...tipografia.subtitulo, color: colores.textoSecundario },
  panico: { marginTop: 20 },
});
