/**
 * Ruta `/residente/avisos` (rol Residente): pantalla P4 · Avisos del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF10, RF11 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Avisos() {
  return <PantallaMarcador id="P4" titulo="Avisos" requisitos="RF10, RF11" />;
}
