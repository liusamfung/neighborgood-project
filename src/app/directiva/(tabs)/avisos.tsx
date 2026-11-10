/**
 * Ruta `/directiva/avisos` (rol Directiva): Avisos publicados (sin mockup, ver docs/design/DISENO.md).
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF7, RF11 (Sprint 4).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Avisos() {
  return (
    <PantallaMarcador
      titulo="Avisos publicados"
      requisitos="RF7, RF11"
      enlace={{ texto: 'Crear aviso', href: '/directiva/avisos/nuevo' }}
    />
  );
}
