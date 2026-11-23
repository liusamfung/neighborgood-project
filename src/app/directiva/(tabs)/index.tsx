/**
 * Ruta `/directiva` (rol Directiva): pantalla P12 · Panel del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF28, RF31 (Sprint 5).
 * Mientras tanto, su enlace abre la pantalla de residentes (`/directiva/residentes`, RF5), que no
 * tiene pestaña propia.
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { Link } from 'expo-router';
import { View } from 'react-native';
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Panel() {
  return (
    <View style={{ flex: 1 }}>
      <Link href="/directiva/alertas" style={{ padding: 20, fontSize: 18 }}>
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
