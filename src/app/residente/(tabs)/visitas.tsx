/**
 * Ruta `/residente/visitas` (rol Residente): pantalla P6 · Visitas y pase QR del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF15 a RF17, RF22 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Visitas() {
  return <PantallaMarcador id="P6" titulo="Visitas y pase QR" requisitos="RF15 a RF17, RF22" />;
}
