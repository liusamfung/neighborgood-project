/**
 * Ruta `/directiva/avisos/nuevo` (rol Directiva): pantalla P13 · Crear aviso del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF7, RF13 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `directiva/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function NuevoAviso() {
  return <PantallaMarcador id="P13" titulo="Crear aviso" requisitos="RF7, RF13" />;
}
