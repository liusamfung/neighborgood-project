/**
 * Ruta `/directiva/encuestas/[id]/resultados` (rol Directiva): pantalla P14b · Resultados de la encuesta del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF12 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `directiva/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Resultados() {
  return <PantallaMarcador id="P14b" titulo="Resultados de la encuesta" requisitos="RF12" />;
}
