/**
 * Ruta `/residente/alerta/tipo` (rol Residente): pantalla P3 · Elegir tipo de alerta y confirmar del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF23 a RF25 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `residente/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function TipoAlerta() {
  return (
    <PantallaMarcador
      id="P3"
      titulo="Elegir tipo de alerta y confirmar"
      requisitos="RF23 a RF25"
      enlace={{ texto: 'Confirmar alerta', href: '/residente/alerta/enviada' }}
    />
  );
}
