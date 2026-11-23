/** Ruta RF11 del residente: consulta publicaciones de su sector mediante el componente compartido. */
import { HistorialPublicaciones } from '@/componentes/publicaciones/HistorialPublicaciones';

/** Permite alternar avisos/encuestas y filtrar su vigencia. */
export default function Historial() {
  return <HistorialPublicaciones titulo="Historial" />;
}
