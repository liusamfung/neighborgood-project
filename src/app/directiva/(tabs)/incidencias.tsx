/**
 * Ruta `/directiva/incidencias` (rol Directiva): pantalla P15 · Gestión de incidencias del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF30, RF31 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Incidencias() {
  return <PantallaMarcador id="P15" titulo="Gestión de incidencias" requisitos="RF30, RF31" />;
}
