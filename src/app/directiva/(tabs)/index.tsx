/**
 * Ruta `/directiva` (rol Directiva): pantalla P12 · Panel del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF28, RF31 (Sprint 5).
 * Mientras tanto ofrece dos accesos: el enlace de arriba abre la atención de alertas
 * (`/directiva/alertas`, RF27) y el del marcador abre la pantalla de residentes (`/directiva/residentes`,
 * RF5); ninguna de las dos tiene pestaña propia. El marcador trae el botón "Cerrar sesión".
 * Deja el alto de la barra de estado (hora, batería, isla dinámica) para que el enlace de arriba no quede
 * debajo de ella, donde no se veía ni se podía tocar.
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PantallaMarcador } from '@/componentes/PantallaMarcador';
import { colores, tamanos, tipografia } from '@/tema';

/** P12 · Panel de la directiva (provisional): acceso a las alertas y a los residentes. */
export default function Panel() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[estilos.pantalla, { paddingTop: top }]}>
      <Link href="/directiva/alertas" style={estilos.enlace}>
        Atención de alertas
      </Link>
      <PantallaMarcador
        id="P12"
        titulo="Panel"
        requisitos="RF28, RF31"
        enlace={{ texto: 'Residentes (alta y baja)', href: '/directiva/residentes' }}
      />
    </View>
  );
}

// El enlace usa el color y la tipografía del tema y mide al menos el área táctil mínima (RNF8).
const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  enlace: {
    ...tipografia.subtitulo,
    padding: 20,
    minHeight: tamanos.areaTactilMinima,
    color: colores.principal,
  },
});
