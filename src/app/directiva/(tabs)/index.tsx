/**
 * Ruta `/directiva` (rol Directiva): pantalla P12 · Panel del mockup.
 *
 * Qué hace: muestra el saludo, dos accesos y la gráfica mensual de incidencias (RF31). Los accesos son
 * "Atención de alertas" (`/directiva/alertas`, RF27) y "Residentes (alta y baja)" (`/directiva/residentes`,
 * RF5); ninguna de las dos pantallas tiene pestaña propia. Al final está "Cerrar sesión" con confirmación.
 * Cómo funciona: el contenido se desplaza para poder leer la gráfica de seis o doce meses con letra grande.
 * Deja el alto de la barra de estado (hora, batería, isla dinámica) para que el primer enlace no quede
 * debajo de ella, donde no se veía ni se podía tocar.
 * Se usa con: la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 * Depende de: `src/componentes/incidencias/GraficaIncidencias.tsx` (RF31), `BotonCerrarSesion` y `useSesion`.
 */
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonCerrarSesion } from '@/componentes/BotonCerrarSesion';
import { GraficaIncidencias } from '@/componentes/incidencias/GraficaIncidencias';
import { useSesion } from '@/contexto/SesionContext';
import { colores, tamanos, tipografia } from '@/tema';

/** P12 · Panel de la directiva: accesos a alertas y residentes, y la gráfica mensual de incidencias. */
export default function Panel() {
  const { perfil } = useSesion();
  const { top } = useSafeAreaInsets();
  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingTop: top + 12 }]}
    >
      <Text style={tipografia.subtitulo}>Hola, {perfil?.nombre}</Text>
      <Link href="/directiva/alertas" style={estilos.enlace}>
        Atención de alertas
      </Link>
      <Link href="/directiva/residentes" style={estilos.enlace}>
        Residentes (alta y baja)
      </Link>
      <GraficaIncidencias />
      <BotonCerrarSesion />
    </ScrollView>
  );
}

// Los enlaces usan el color y la tipografía del tema y miden al menos el área táctil mínima (RNF8).
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingHorizontal: 24, gap: 16, paddingBottom: 48 },
  enlace: {
    ...tipografia.subtitulo,
    minHeight: tamanos.areaTactilMinima,
    color: colores.principal,
  },
});
