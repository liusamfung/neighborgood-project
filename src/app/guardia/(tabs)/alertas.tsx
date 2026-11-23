/** RF27: ruta protegida de consulta; ListaAtencion recupera las alertas visibles por RLS. */
import { ListaAtencion } from '@/componentes/alertas/ListaAtencion';
/** Lista y navegación de alertas reales para el guardia; es una pestaña, así que respeta la barra de estado. */
export default function Alertas() {
  return <ListaAtencion esPestana />;
}
