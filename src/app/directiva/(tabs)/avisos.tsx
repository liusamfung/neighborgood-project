/**
 * Ruta `/directiva/avisos` (rol Directiva): Avisos publicados (sin mockup, ver docs/design/DISENO.md).
 * RF11: historial con filtros y acceso a la publicación RF7, mediante HistorialPublicaciones.
 * La barra inferior registra esta ruta. RLS determina el contenido disponible.
 */
import { HistorialPublicaciones } from '@/componentes/publicaciones/HistorialPublicaciones';

/** La directiva conserva la creación y consulta sus avisos anteriores y vigentes. */
export default function Avisos() {
  return (
    <HistorialPublicaciones
      titulo="Avisos publicados"
      tipoFijo="avisos"
      crearHref="/directiva/avisos/nuevo"
      conCerrarSesion
    />
  );
}
