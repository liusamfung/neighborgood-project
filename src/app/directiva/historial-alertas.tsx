/**
 * Ruta `/directiva/historial-alertas` (rol Directiva): Historial de alertas (sin mockup; RF28, Sprint 5).
 * Se abre con el botón "Ver historial" de Atención de alertas (`ListaAtencion`) y la registra la pila de
 * `src/app/directiva/_layout.tsx`. Todo el contenido está en `src/componentes/alertas/HistorialAlertas.tsx`.
 */
import { HistorialAlertas } from '@/componentes/alertas/HistorialAlertas';

/** Historial de alertas con filtros por tipo y estado. */
export default function HistorialDeAlertas() {
  return <HistorialAlertas />;
}
