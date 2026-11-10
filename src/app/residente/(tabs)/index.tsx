/**
 * Ruta `/residente` (rol Residente): pantalla P2 · Inicio del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF23 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Inicio() {
  return (
    <PantallaMarcador
      id="P2"
      titulo="Inicio"
      requisitos="RF23"
      enlace={{ texto: 'Enviar alerta de emergencia', href: '/residente/alerta/tipo' }}
    />
  );
}
