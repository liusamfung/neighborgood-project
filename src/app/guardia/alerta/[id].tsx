/**
 * Ruta `/guardia/alerta/[id]` (rol Guardia): pantalla P10 · Detalle de la alerta del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF27 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `guardia/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function DetalleAlerta() {
  return <PantallaMarcador id="P10" titulo="Detalle de la alerta" requisitos="RF27" />;
}
