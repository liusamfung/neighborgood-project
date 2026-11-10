/**
 * Ruta `/residente/alerta/enviada` (rol Residente): pantalla P3b · Alerta enviada del mockup.
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF23 (Sprint 5).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `residente/_layout.tsx`, que la declara como pantalla apilada.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function AlertaEnviada() {
  return (
    <PantallaMarcador
      id="P3b"
      titulo="Alerta enviada"
      requisitos="RF23"
      enlace={{ texto: 'Volver al inicio', href: '/residente' }}
    />
  );
}
