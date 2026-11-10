/**
 * Ruta `/guardia/escaner` (rol Guardia): pantalla P11 · Escáner QR del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF18 a RF20 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Escaner() {
  return <PantallaMarcador id="P11" titulo="Escáner QR" requisitos="RF18 a RF20" />;
}
