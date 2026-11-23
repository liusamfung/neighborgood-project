/**
 * Ruta `/directiva/encuestas` (rol Directiva): Encuestas (sin mockup, ver docs/design/DISENO.md).
 * RF11: historial con filtros y acceso a creación/resultados mediante HistorialPublicaciones.
 * La barra inferior registra esta ruta. RLS determina el contenido disponible.
 */
import { HistorialPublicaciones } from '@/componentes/publicaciones/HistorialPublicaciones';

/** Consulta todas las vigencias y conserva la creación RF8 y la ruta de resultados RF12. */
export default function Encuestas() {
  return (
    <HistorialPublicaciones
      titulo="Encuestas"
      tipoFijo="encuestas"
      crearHref="/directiva/encuestas/nueva"
    />
  );
}
