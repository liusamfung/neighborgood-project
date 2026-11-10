/**
 * Ruta `/guardia/alertas` (rol Guardia): pantalla P9 · Alertas activas del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF25, RF28 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Alertas() {
  return (
    <PantallaMarcador
      id="P9"
      titulo="Alertas activas"
      requisitos="RF25, RF28"
      enlace={{ texto: 'Ver detalle de una alerta', href: '/guardia/alerta/ejemplo' }}
    />
  );
}
