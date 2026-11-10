/**
 * Ruta `/directiva/encuestas` (rol Directiva): Encuestas (sin mockup, ver docs/design/DISENO.md).
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF8, RF11 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Encuestas() {
  return (
    <PantallaMarcador
      titulo="Encuestas"
      requisitos="RF8, RF11"
      enlace={{ texto: 'Crear encuesta', href: '/directiva/encuestas/nueva' }}
    />
  );
}
