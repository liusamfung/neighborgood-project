/**
 * Ruta `/residente/perfil` (rol Residente): pantalla P8 · Perfil y contactos de emergencia del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF4 (Sprint 3).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Perfil() {
  return <PantallaMarcador id="P8" titulo="Perfil y contactos de emergencia" requisitos="RF4" />;
}
