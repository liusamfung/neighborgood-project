/**
 * Ruta `/residente/incidencias` (rol Residente): Mis incidencias (sin mockup, ver docs/design/DISENO.md).
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF29, RF30 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Incidencias() {
  return <PantallaMarcador titulo="Mis incidencias" requisitos="RF29, RF30" />;
}
