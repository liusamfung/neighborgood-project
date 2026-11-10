/**
 * Ruta `/residente/encuesta/[id]` (rol Residente): pantalla P5 · Encuesta del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF9 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `residente/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Encuesta() {
  return <PantallaMarcador id="P5" titulo="Encuesta" requisitos="RF9" />;
}
