/**
 * Ruta `/residente/incidencias/nueva` (rol Residente): pantalla P7 · Reportar incidencia del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF29 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `residente/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function NuevaIncidencia() {
  return <PantallaMarcador id="P7" titulo="Reportar incidencia" requisitos="RF29" />;
}
