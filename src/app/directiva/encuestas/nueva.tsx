/**
 * Ruta `/directiva/encuestas/nueva` (rol Directiva): pantalla P14 · Crear encuesta del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF8, RF13, RF14 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `directiva/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function NuevaEncuesta() {
  return <PantallaMarcador id="P14" titulo="Crear encuesta" requisitos="RF8, RF13, RF14" />;
}
